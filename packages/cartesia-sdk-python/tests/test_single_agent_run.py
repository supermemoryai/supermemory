"""Regression tests: the wrapped agent must run exactly once per event.

The whole body of process() used to sit in one try/except whose fallback
re-invoked self.agent.process(). An agent error raised mid-stream — after
chunks had already been yielded to the caller — therefore re-ran the entire
agent: duplicated visible output and a duplicate LLM call. Memory-enrichment
failures are the only thing the fallback was meant to absorb.
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
            def info(self, *_args, **_kwargs):
                return None

            def debug(self, *_args, **_kwargs):
                return None

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


_install_test_stubs()

from supermemory_cartesia.agent import SupermemoryCartesiaAgent


class _StreamingAgent:
    """Inner agent that yields chunks; optionally dies mid-stream."""

    def __init__(self, fail_after_chunks: bool = False):
        self.fail_after_chunks = fail_after_chunks
        self.run_count = 0

    async def process(self, env, event):
        self.run_count += 1
        yield "chunk-1"
        yield "chunk-2"
        if self.fail_after_chunks:
            raise RuntimeError("stream dropped")


def _wrap(inner):
    return SupermemoryCartesiaAgent(
        agent=inner,
        api_key="mock_key",
        container_tag="user-123",
        custom_id="conversation-456",
    )


def _user_turn_ended_event():
    return type("UserTurnEnded", (), {})()


class TestSingleAgentRun(unittest.IsolatedAsyncioTestCase):
    async def test_mid_stream_agent_error_is_not_retried(self) -> None:
        inner = _StreamingAgent(fail_after_chunks=True)
        wrapper = _wrap(inner)

        outputs = []
        with self.assertRaises(RuntimeError):
            async for out in wrapper.process(None, SimpleNamespace()):
                outputs.append(out)

        # The caller saw each chunk exactly once and the agent ran once —
        # no duplicated response, no duplicate LLM call.
        self.assertEqual(outputs, ["chunk-1", "chunk-2"])
        self.assertEqual(inner.run_count, 1)

    async def test_mid_stream_error_on_user_turn_is_not_retried(self) -> None:
        inner = _StreamingAgent(fail_after_chunks=True)
        wrapper = _wrap(inner)
        wrapper._enrich_event_with_memories = AsyncMock(
            side_effect=lambda event: (event, None)
        )

        outputs = []
        with self.assertRaises(RuntimeError):
            async for out in wrapper.process(None, _user_turn_ended_event()):
                outputs.append(out)

        self.assertEqual(outputs, ["chunk-1", "chunk-2"])
        self.assertEqual(inner.run_count, 1)

    async def test_enrichment_failure_still_runs_agent_once(self) -> None:
        inner = _StreamingAgent()
        wrapper = _wrap(inner)
        wrapper._enrich_event_with_memories = AsyncMock(
            side_effect=RuntimeError("enrichment exploded")
        )

        outputs = [
            out async for out in wrapper.process(None, _user_turn_ended_event())
        ]

        # Memory failure is absorbed; the agent still runs, exactly once.
        self.assertEqual(outputs, ["chunk-1", "chunk-2"])
        self.assertEqual(inner.run_count, 1)


if __name__ == "__main__":
    unittest.main()
