"""Regression tests: injected <user_memories> blocks must not be re-stored.

LLMContext.get_messages() returns the context's live message list (the
enhancement code relies on that to mutate it in place). The frame handler
used to snapshot that same reference *before* injecting the memory block,
so the injected user-message showed up in storable_messages and was written
back to Supermemory as a brand-new memory — recalled and re-stored again on
every following turn.
"""

from __future__ import annotations

import sys
import types
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock


def _install_test_stubs() -> None:
    if "loguru" not in sys.modules:
        loguru_module = types.ModuleType("loguru")

        class _Logger:
            def warning(self, *_args, **_kwargs):
                return None

            def error(self, *_args, **_kwargs):
                return None

        loguru_module.logger = _Logger()
        sys.modules["loguru"] = loguru_module

    if "pydantic" not in sys.modules:
        pydantic_module = types.ModuleType("pydantic")

        class BaseModel:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)

        def Field(*, default=None, **_kwargs):
            return default

        pydantic_module.BaseModel = BaseModel
        pydantic_module.Field = Field
        sys.modules["pydantic"] = pydantic_module

    if "pipecat" not in sys.modules:
        pipecat_module = types.ModuleType("pipecat")
        sys.modules["pipecat"] = pipecat_module

        frames_module = types.ModuleType("pipecat.frames.frames")

        class Frame:  # pragma: no cover - import stub
            pass

        class InputAudioRawFrame:  # pragma: no cover - import stub
            pass

        class LLMContextFrame:  # pragma: no cover - import stub
            pass

        class LLMMessagesFrame:  # pragma: no cover - import stub
            pass

        frames_module.Frame = Frame
        frames_module.InputAudioRawFrame = InputAudioRawFrame
        frames_module.LLMContextFrame = LLMContextFrame
        frames_module.LLMMessagesFrame = LLMMessagesFrame

        llm_context_module = types.ModuleType(
            "pipecat.processors.aggregators.llm_context"
        )

        class LLMContext:  # pragma: no cover - import stub
            pass

        llm_context_module.LLMContext = LLMContext

        openai_context_module = types.ModuleType(
            "pipecat.processors.aggregators.openai_llm_context"
        )

        class OpenAILLMContextFrame:  # pragma: no cover - import stub
            pass

        openai_context_module.OpenAILLMContextFrame = OpenAILLMContextFrame

        frame_processor_module = types.ModuleType(
            "pipecat.processors.frame_processor"
        )

        class FrameDirection:  # pragma: no cover - import stub
            pass

        class FrameProcessor:
            def __init__(self, *args, **kwargs):
                return None

        frame_processor_module.FrameDirection = FrameDirection
        frame_processor_module.FrameProcessor = FrameProcessor

        sys.modules["pipecat.frames.frames"] = frames_module
        sys.modules["pipecat.processors.aggregators.llm_context"] = llm_context_module
        sys.modules[
            "pipecat.processors.aggregators.openai_llm_context"
        ] = openai_context_module
        sys.modules["pipecat.processors.frame_processor"] = frame_processor_module

    # process_frame calls super().process_frame(); give whichever stub is
    # installed (this file's or test_empty_profile's) an async no-op.
    fp = sys.modules["pipecat.processors.frame_processor"]
    if not hasattr(fp.FrameProcessor, "process_frame"):

        async def _noop_process_frame(self, _frame, _direction):
            return None

        fp.FrameProcessor.process_frame = _noop_process_frame


_install_test_stubs()

from pipecat.frames.frames import LLMContextFrame

from supermemory_pipecat.service import (
    MEMORY_TAG_START,
    SupermemoryPipecatService,
    _is_memory_injection,
)


class _FakeLLMContext:
    """Mimics pipecat's LLMContext: get_messages() returns the live list."""

    def __init__(self, messages):
        self._messages = messages

    def get_messages(self):
        return self._messages

    def add_message(self, message):
        self._messages.append(message)


class _MockSupermemoryClient:
    def __init__(self, response):
        self.profile = AsyncMock(return_value=response)


def _profile_response():
    return SimpleNamespace(
        profile=SimpleNamespace(static=["User likes Python"], dynamic=[]),
        search_results=None,
    )


def _make_service():
    service = SupermemoryPipecatService(api_key="mock_key", user_id="user_123")
    service._supermemory_client = _MockSupermemoryClient(_profile_response())
    service._store_messages = AsyncMock()
    service.push_frame = AsyncMock()
    return service


def _frame_for(context):
    frame = LLMContextFrame()
    frame.context = context
    return frame


class TestNoMemoryRestorage(unittest.IsolatedAsyncioTestCase):
    async def test_injected_memory_block_is_not_stored(self) -> None:
        service = _make_service()
        context = _FakeLLMContext([{"role": "user", "content": "Hello"}])

        await service.process_frame(_frame_for(context), direction=None)

        # The memory block was injected into the live context...
        injected = [m for m in context.get_messages() if _is_memory_injection(m)]
        self.assertEqual(len(injected), 1)

        # ...but only the real user message was queued for storage.
        service._store_messages.assert_called_once()
        stored = service._store_messages.call_args.args[0]
        self.assertEqual(stored, [{"role": "user", "content": "Hello"}])

    async def test_previous_turn_injection_is_filtered_from_storage(self) -> None:
        service = _make_service()
        service._messages_sent_count = 1  # "Hello" already stored last turn
        context = _FakeLLMContext(
            [
                {"role": "user", "content": "Hello"},
                {"role": "user", "content": f"{MEMORY_TAG_START}\nrecalled\n"},
                {"role": "assistant", "content": "Hi there"},
                {"role": "user", "content": "What next?"},
            ]
        )

        await service.process_frame(_frame_for(context), direction=None)

        service._store_messages.assert_called_once()
        stored = service._store_messages.call_args.args[0]
        self.assertEqual(
            stored,
            [
                {"role": "assistant", "content": "Hi there"},
                {"role": "user", "content": "What next?"},
            ],
        )
        for msg in stored:
            self.assertNotIn(MEMORY_TAG_START, msg["content"])

    async def test_is_memory_injection_tolerates_non_string_content(self) -> None:
        self.assertFalse(_is_memory_injection({"role": "user", "content": None}))
        self.assertFalse(_is_memory_injection({"role": "user", "content": ["parts"]}))
        self.assertTrue(
            _is_memory_injection(
                {"role": "user", "content": f"{MEMORY_TAG_START} recalled"}
            )
        )


if __name__ == "__main__":
    unittest.main()
