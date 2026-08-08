"""Shared pytest fixtures: stub out heavy optional dependencies.

The stubs are installed at collection time so test modules can import the
package without pipecat/cartesia, loguru, or pydantic present.
"""

from __future__ import annotations

import sys
import types


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
