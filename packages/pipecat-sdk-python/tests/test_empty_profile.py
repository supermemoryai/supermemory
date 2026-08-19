from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock

from .conftest import _install_test_stubs

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