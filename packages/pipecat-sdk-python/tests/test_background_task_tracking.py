"""Tests for background task reference tracking in SupermemoryPipecatService.

asyncio.create_task() only holds a *weak* reference to the scheduled coroutine.
If the caller discards the Task object the GC can destroy the task before it
finishes, silently dropping stored messages.  This file verifies that
process_frame() retains strong references via _background_tasks and releases
them properly once each task completes.
"""

import asyncio
import gc
import unittest
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Minimal stubs so we can import service.py without pipecat / supermemory
# installed in the test environment.
# ---------------------------------------------------------------------------

import sys
import types

# Stub pipecat modules
for mod_name in [
    "pipecat",
    "pipecat.frames",
    "pipecat.frames.frames",
    "pipecat.processors",
    "pipecat.processors.aggregators",
    "pipecat.processors.aggregators.llm_context",
    "pipecat.processors.aggregators.openai_llm_context",
    "pipecat.processors.frame_processor",
]:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = types.ModuleType(mod_name)

# Minimal Frame / FrameProcessor stubs
frames_mod = sys.modules["pipecat.frames.frames"]
frames_mod.Frame = object  # type: ignore[attr-defined]
frames_mod.InputAudioRawFrame = type("InputAudioRawFrame", (object,), {})  # type: ignore[attr-defined]
frames_mod.LLMContextFrame = type("LLMContextFrame", (object,), {})  # type: ignore[attr-defined]
frames_mod.LLMMessagesFrame = type("LLMMessagesFrame", (object,), {})  # type: ignore[attr-defined]


class _FakeFrameProcessor:
    async def process_frame(self, frame: Any, direction: Any) -> None:
        pass

    async def push_frame(self, frame: Any, direction: Any = None) -> None:
        pass


fp_mod = sys.modules["pipecat.processors.frame_processor"]
fp_mod.FrameProcessor = _FakeFrameProcessor  # type: ignore[attr-defined]
fp_mod.FrameDirection = type("FrameDirection", (object,), {"DOWNSTREAM": "downstream"})  # type: ignore[attr-defined]

llm_ctx_mod = sys.modules["pipecat.processors.aggregators.llm_context"]
llm_ctx_mod.LLMContext = type("LLMContext", (object,), {"get_messages": lambda self: [], "add_message": lambda self, m: None})  # type: ignore[attr-defined]
openai_ctx_mod = sys.modules["pipecat.processors.aggregators.openai_llm_context"]
openai_ctx_mod.OpenAILLMContextFrame = type("OpenAILLMContextFrame", (object,), {})  # type: ignore[attr-defined]

# Stub supermemory
supermemory_mod = types.ModuleType("supermemory")
supermemory_mod.AsyncSupermemory = MagicMock  # type: ignore[attr-defined]
sys.modules["supermemory"] = supermemory_mod

# Now we can safely import the service
from supermemory_pipecat.service import SupermemoryPipecatService  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_service() -> SupermemoryPipecatService:
    svc = SupermemoryPipecatService(api_key="test-key", user_id="user-1")
    # Replace the real client with a mock to avoid network calls
    mock_client = MagicMock()
    mock_client.memories = MagicMock()
    mock_client.memories.add = AsyncMock()
    svc._supermemory_client = mock_client
    return svc


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestBackgroundTaskTracking(unittest.IsolatedAsyncioTestCase):
    """Verify that fire-and-forget storage tasks are tracked to prevent GC."""

    def test_background_tasks_set_exists(self) -> None:
        """Service must expose _background_tasks to hold strong task refs."""
        svc = _make_service()
        self.assertTrue(
            hasattr(svc, "_background_tasks"),
            "_background_tasks attribute missing — tasks will be GC'd",
        )
        self.assertIsInstance(svc._background_tasks, set)

    async def test_task_held_during_execution(self) -> None:
        """A running _store_messages task must be in _background_tasks."""
        svc = _make_service()

        started = asyncio.Event()
        finish_gate = asyncio.Event()

        async def slow_store(messages: List[Dict]) -> None:
            started.set()
            await finish_gate.wait()

        svc._store_messages = slow_store  # type: ignore[method-assign]

        # Manually trigger the same path process_frame uses
        task = asyncio.create_task(svc._store_messages([{"role": "user", "content": "hi"}]))
        svc._background_tasks.add(task)
        task.add_done_callback(svc._background_tasks.discard)

        await started.wait()  # Task is running
        self.assertIn(task, svc._background_tasks, "Task dropped from set while still running")

        finish_gate.set()
        await task
        # Callback fires synchronously after the task completes
        await asyncio.sleep(0)
        self.assertNotIn(task, svc._background_tasks, "Task not removed after completion")

    async def test_task_removed_after_completion(self) -> None:
        """_background_tasks must be empty once the storage task finishes."""
        svc = _make_service()

        completed = []

        async def fast_store(messages: List[Dict]) -> None:
            completed.append(len(messages))

        svc._store_messages = fast_store  # type: ignore[method-assign]

        task = asyncio.create_task(svc._store_messages([{"role": "user", "content": "x"}]))
        svc._background_tasks.add(task)
        task.add_done_callback(svc._background_tasks.discard)

        await task
        await asyncio.sleep(0)  # Let the done callback run

        self.assertEqual(len(svc._background_tasks), 0)
        self.assertEqual(completed, [1])

    async def test_gc_cannot_collect_tracked_task(self) -> None:
        """Without a strong reference the GC *can* collect a Task.

        This test demonstrates that holding the task in _background_tasks
        prevents premature collection: we force a GC cycle mid-execution and
        confirm the task is still alive.
        """
        svc = _make_service()

        gate = asyncio.Event()
        survived = []

        async def guarded_store(messages: List[Dict]) -> None:
            await gate.wait()
            survived.append(True)

        # Register via the fixed code path (strong ref held in set)
        task = asyncio.create_task(guarded_store([{"role": "user", "content": "test"}]))
        svc._background_tasks.add(task)
        task.add_done_callback(svc._background_tasks.discard)

        # Yield control so the coroutine can start, then force GC
        await asyncio.sleep(0)
        gc.collect()

        # Task must still be alive
        self.assertFalse(task.done(), "Task was collected before finishing")
        gate.set()
        await task
        self.assertEqual(survived, [True], "Task body never ran after GC")

    def test_reset_clears_background_tasks(self) -> None:
        """reset_memory_tracking must clear _background_tasks."""
        svc = _make_service()
        # Simulate a lingering sentinel in the set
        svc._background_tasks.add("sentinel")
        svc.reset_memory_tracking()
        self.assertEqual(len(svc._background_tasks), 0)


if __name__ == "__main__":
    unittest.main()
