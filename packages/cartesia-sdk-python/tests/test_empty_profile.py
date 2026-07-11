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


class _MockSupermemoryClient:
    def __init__(self, response):
        self.profile = AsyncMock(return_value=response)


class TestSupermemoryCartesiaNullProfile(unittest.IsolatedAsyncioTestCase):
    async def test_retrieve_memories_handles_null_profile(self) -> None:
        agent = SupermemoryCartesiaAgent(
            agent=SimpleNamespace(),
            api_key="mock_key",
            container_tag="user-123",
            custom_id="conversation-456",
        )

        response = SimpleNamespace(profile=None, search_results=None)
        agent._supermemory_client = _MockSupermemoryClient(response)

        result = await agent._retrieve_memories("Hello world")

        self.assertEqual(
            result,
            {
                "profile": {"static": [], "dynamic": []},
                "search_results": [],
            },
        )


if __name__ == "__main__":
    unittest.main()
