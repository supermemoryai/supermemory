from __future__ import annotations

import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
from supermemory import AsyncSupermemory

from supermemory_pipecat.service import SupermemoryPipecatService
from supermemory_pipecat.utils import format_memories_to_text


class _Context:
    def __init__(self, messages):
        self.messages = messages

    def get_messages(self):
        return self.messages

    def add_message(self, message):
        self.messages.append(message)


class TestSupermemoryPipecatService(unittest.IsolatedAsyncioTestCase):
    async def test_v5_reads_and_writes_use_user_id_as_namespace(self) -> None:
        requests = {}
        failed = set()

        def respond(request):
            requests[request.url.path] = json.loads(request.content)
            if request.url.path.rsplit("/", 1)[-1] in failed:
                return httpx.Response(500)
            if request.url.path.endswith("/profile"):
                payload = {"profile": {"static": [{"memory": "Likes tea"}], "dynamic": []}}
            elif request.url.path.endswith("/search"):
                payload = {
                    "results": [
                        {
                            "id": "mem_123",
                            "memory": "Plans a trip",
                            "metadata": {},
                            "similarity": 0.9,
                            "isLatest": True,
                            "isInference": False,
                            "system": {"updatedAt": "2020-01-01T00:00:00Z"},
                        }
                    ]
                }
            else:
                payload = {"id": "conversation-456"}
            return httpx.Response(200, json=payload)

        async with AsyncSupermemory(
            api_key="mock_key",
            base_url="https://example.test",
            http_client=httpx.AsyncClient(transport=httpx.MockTransport(respond)),
        ) as client:
            service = SupermemoryPipecatService(
                api_key="mock_key",
                user_id="user-123",
                session_id="conversation-456",
                params=SupermemoryPipecatService.InputParams(search_limit=500),
            )
            service._supermemory_client = client
            result = await service._retrieve_memories("Where am I going?")
            await service._store_messages([{"role": "user", "content": "Hello"}])
            failed.add("search")
            partial_result = await service._retrieve_memories("Where am I going?")
            failed.clear()
            failed.add("profile")
            search_only_result = await service._retrieve_memories("Where am I going?")

        self.assertEqual(result["profile"]["static"], ["Likes tea"])
        self.assertEqual(result["search_results"][0].memory, "Plans a trip")
        self.assertEqual(
            set(requests), {"/ns/user-123/profile", "/ns/user-123/search", "/ns/user-123/document"}
        )
        self.assertEqual(requests["/ns/user-123/search"]["query"], "Where am I going?")
        self.assertEqual(requests["/ns/user-123/search"]["limit"], 100)
        self.assertEqual(requests["/ns/user-123/document"]["id"], "conversation-456")
        self.assertEqual(partial_result["profile"]["static"], ["Likes tea"])
        self.assertEqual(partial_result["search_results"], [])
        self.assertEqual(search_only_result["profile"]["static"], [])
        self.assertEqual(search_only_result["search_results"][0].memory, "Plans a trip")
        self.assertIn(
            "[1 Jan, 2020] Plans a trip",
            format_memories_to_text(
                {"static": [], "dynamic": [], "search_results": result["search_results"]}
            ),
        )

    async def test_retrieve_memories_handles_null_profile(self) -> None:
        service = SupermemoryPipecatService(api_key="mock_key", user_id="new_user_123")
        service._supermemory_client = SimpleNamespace(
            profile=AsyncMock(return_value=SimpleNamespace(profile=None)),
            search=AsyncMock(return_value=SimpleNamespace(results=[])),
        )

        self.assertEqual(
            await service._retrieve_memories("Hello world"),
            {"profile": {"static": [], "dynamic": []}, "search_results": []},
        )

    def test_query_mode_keeps_search_fact_also_present_in_profile(self) -> None:
        fact = "User likes machine learning projects"
        service = SupermemoryPipecatService(
            api_key="mock_key",
            user_id="user-123",
            session_id="conversation-456",
            params=SupermemoryPipecatService.InputParams(mode="query"),
        )
        context = _Context([{"role": "user", "content": "What do I like?"}])
        service._enhance_context_with_memories(
            context,
            "What do I like?",
            {
                "profile": {"static": [fact], "dynamic": []},
                "search_results": [SimpleNamespace(memory=fact)],
            },
        )

        self.assertTrue(any(fact in message.get("content", "") for message in context.messages))

    def test_system_injection_replaces_stale_block_with_backslash_memory(self) -> None:
        backslash = chr(92)
        fact = "User's repo is at C:" + backslash + "Users" + backslash + "alice"
        service = SupermemoryPipecatService(
            api_key="mock_key",
            user_id="user-123",
            session_id="conversation-456",
            params=SupermemoryPipecatService.InputParams(inject_mode="system"),
        )
        stale = "<user_memories>\nStale fact\n</user_memories>"
        context = _Context(
            [
                {"role": "system", "content": "You are helpful.\n\n" + stale},
                {"role": "user", "content": "Where is my repo?"},
            ]
        )
        service._enhance_context_with_memories(
            context,
            "Where is my repo?",
            {"profile": {"static": [fact], "dynamic": []}, "search_results": []},
        )

        system_content = context.messages[0]["content"]
        self.assertIn(fact, system_content)
        self.assertNotIn("Stale fact", system_content)
        self.assertIn("You are helpful.", system_content)
        self.assertEqual(system_content.count("<user_memories>"), 1)
