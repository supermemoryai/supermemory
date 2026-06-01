import importlib.util
import asyncio
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace


PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "src" / "supermemory_pipecat"


def load_service_module():
    package = ModuleType("supermemory_pipecat")
    package.__path__ = [str(PACKAGE_ROOT)]
    sys.modules["supermemory_pipecat"] = package

    pipecat = ModuleType("pipecat")
    pipecat.__path__ = []
    pipecat_frames = ModuleType("pipecat.frames")
    pipecat_frames.__path__ = []
    pipecat_frames_frames = ModuleType("pipecat.frames.frames")
    pipecat_frames_frames.Frame = object
    pipecat_frames_frames.InputAudioRawFrame = type("InputAudioRawFrame", (), {})
    pipecat_frames_frames.LLMContextFrame = type("LLMContextFrame", (), {})
    pipecat_frames_frames.LLMMessagesFrame = type("LLMMessagesFrame", (), {})

    pipecat_processors = ModuleType("pipecat.processors")
    pipecat_processors.__path__ = []
    pipecat_aggregators = ModuleType("pipecat.processors.aggregators")
    pipecat_aggregators.__path__ = []
    pipecat_llm_context = ModuleType("pipecat.processors.aggregators.llm_context")
    pipecat_llm_context.LLMContext = type("LLMContext", (), {})
    pipecat_openai_context = ModuleType(
        "pipecat.processors.aggregators.openai_llm_context"
    )
    pipecat_openai_context.OpenAILLMContextFrame = type(
        "OpenAILLMContextFrame", (), {}
    )
    pipecat_frame_processor = ModuleType("pipecat.processors.frame_processor")
    loguru = ModuleType("loguru")
    loguru.logger = SimpleNamespace(
        error=lambda *args, **kwargs: None,
        warning=lambda *args, **kwargs: None,
    )
    pipecat_frame_processor.FrameDirection = type("FrameDirection", (), {})
    pipecat_frame_processor.FrameProcessor = type(
        "FrameProcessor",
        (),
        {"__init__": lambda self: None, "push_frame": lambda *args: None},
    )

    sys.modules.update(
        {
            "pipecat": pipecat,
            "pipecat.frames": pipecat_frames,
            "pipecat.frames.frames": pipecat_frames_frames,
            "pipecat.processors": pipecat_processors,
            "pipecat.processors.aggregators": pipecat_aggregators,
            "pipecat.processors.aggregators.llm_context": pipecat_llm_context,
            "pipecat.processors.aggregators.openai_llm_context": pipecat_openai_context,
            "pipecat.processors.frame_processor": pipecat_frame_processor,
            "loguru": loguru,
        }
    )

    spec = importlib.util.spec_from_file_location(
        "supermemory_pipecat.service", PACKAGE_ROOT / "service.py"
    )
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["supermemory_pipecat.service"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class ProfileClient:
    async def profile(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(profile=None, search_results=None)


def test_retrieve_memories_treats_missing_profile_as_empty():
    module = load_service_module()
    service = object.__new__(module.SupermemoryPipecatService)
    service._supermemory_client = ProfileClient()
    service.container_tag = "user-123"
    service.params = module.SupermemoryPipecatService.InputParams()

    result = asyncio.run(service._retrieve_memories("hello"))

    assert result == {
        "profile": {"static": [], "dynamic": []},
        "search_results": [],
    }
