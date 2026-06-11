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

        llm_context_module = types.ModuleType("pipecat.processors.aggregators.llm_context")

        class LLMContext:  # pragma: no cover - import stub
            pass

        llm_context_module.LLMContext = LLMContext

        openai_context_module = types.ModuleType(
            "pipecat.processors.aggregators.openai_llm_context"
        )

        class OpenAILLMContextFrame:  # pragma: no cover - import stub
            pass

        openai_context_module.OpenAILLMContextFrame = OpenAILLMContextFrame

        frame_processor_module = types.ModuleType("pipecat.processors.frame_processor")

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


_install_test_stubs()

from supermemory_pipecat.service import SupermemoryPipecatService


class _MockSupermemoryClient:
    def __init__(self, response):
        self.profile = AsyncMock(return_value=response)


class TestSupermemoryPipecatNullProfile(unittest.IsolatedAsyncioTestCase):
    async def test_retrieve_memories_handles_null_profile(self) -> None:
        service = SupermemoryPipecatService(api_key="mock_key", user_id="new_user_123")

        response = SimpleNamespace(profile=None, search_results=None)
        service._supermemory_client = _MockSupermemoryClient(response)

        result = await service._retrieve_memories("Hello world")

        self.assertEqual(
            result,
            {
                "profile": {"static": [], "dynamic": []},
                "search_results": [],
            },
        )