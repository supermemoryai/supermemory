"""Regression tests for pydantic/dict memory helpers (#1266)."""

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

            def info(self, *_args, **_kwargs):
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

        class Frame:
            pass

        class InputAudioRawFrame:
            pass

        class LLMContextFrame:
            pass

        class LLMMessagesFrame:
            pass

        frames_module.Frame = Frame
        frames_module.InputAudioRawFrame = InputAudioRawFrame
        frames_module.LLMContextFrame = LLMContextFrame
        frames_module.LLMMessagesFrame = LLMMessagesFrame

        llm_context_module = types.ModuleType(
            "pipecat.processors.aggregators.llm_context"
        )

        class LLMContext:
            pass

        llm_context_module.LLMContext = LLMContext

        openai_context_module = types.ModuleType(
            "pipecat.processors.aggregators.openai_llm_context"
        )

        class OpenAILLMContextFrame:
            pass

        openai_context_module.OpenAILLMContextFrame = OpenAILLMContextFrame

        frame_processor_module = types.ModuleType("pipecat.processors.frame_processor")

        class FrameDirection:
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


_install_test_stubs()

from supermemory_pipecat.service import SupermemoryPipecatService
from supermemory_pipecat.utils import deduplicate_memories, format_memories_to_text


class TestDeduplicateMemories(unittest.TestCase):
    def test_accepts_dict_search_results(self) -> None:
        result = deduplicate_memories(
            static=["User likes Python"],
            dynamic=[],
            search_results=[{"memory": "User prefers async", "updatedAt": "2026-01-01T00:00:00Z"}],
        )
        self.assertEqual(result["static"], ["User likes Python"])
        self.assertEqual(len(result["search_results"]), 1)

    def test_accepts_pydantic_like_search_results(self) -> None:
        model = SimpleNamespace(
            id="mem_1",
            similarity=0.9,
            memory="User prefers async",
            updated_at="2026-01-01T00:00:00Z",
        )
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[model],
        )
        self.assertEqual(len(result["search_results"]), 1)
        self.assertIs(result["search_results"][0], model)

    def test_dedupes_model_against_static_string(self) -> None:
        model = SimpleNamespace(memory="User likes Python", updated_at=None)
        result = deduplicate_memories(
            static=["User likes Python"],
            dynamic=[],
            search_results=[model],
        )
        self.assertEqual(result["search_results"], [])

    def test_dedupes_normalized_fact_variants(self) -> None:
        result = deduplicate_memories(
            static=["User likes Python", " user likes python "],
            dynamic=["[2026-08-10] USER LIKES PYTHON"],
            search_results=[],
        )
        self.assertEqual(result["static"], ["User likes Python"])
        self.assertEqual(result["dynamic"], [])


class TestFormatMemoriesToText(unittest.TestCase):
    def test_formats_pydantic_like_search_results(self) -> None:
        text = format_memories_to_text(
            {
                "static": [],
                "dynamic": [],
                "search_results": [
                    SimpleNamespace(
                        memory="User prefers async",
                        updated_at="2020-01-01T00:00:00Z",
                    )
                ],
            }
        )
        self.assertIn("User prefers async", text)
        self.assertIn("Relevant Memories", text)


class TestStoreMessagesUsesClientAdd(unittest.IsolatedAsyncioTestCase):
    async def test_store_messages_calls_client_add(self) -> None:
        service = SupermemoryPipecatService(api_key="mock_key", user_id="user-123")
        service._supermemory_client = SimpleNamespace(add=AsyncMock())

        await service._store_messages(
            [{"role": "user", "content": "hello"}, {"role": "assistant", "content": "hi"}]
        )

        service._supermemory_client.add.assert_awaited_once()
        kwargs = service._supermemory_client.add.await_args.kwargs
        self.assertIn("hello", kwargs["content"])
        self.assertEqual(kwargs["container_tags"], ["user-123"])


if __name__ == "__main__":
    unittest.main()
