from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock

from .conftest import _install_test_stubs

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
