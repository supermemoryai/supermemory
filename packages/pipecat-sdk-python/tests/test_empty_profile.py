from __future__ import annotations

import asyncio
import copy
import json
import time
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
        self.assertIsNone(search_only_result["profile"])
        self.assertEqual(search_only_result["search_results"][0].memory, "Plans a trip")
        self.assertIn(
            "[2020-01-01] Plans a trip",
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


def _search_hit(memory: str) -> SimpleNamespace:
    return SimpleNamespace(memory=memory, updatedAt="2026-03-04T05:06:07Z")


class TestTurnInjection(unittest.IsolatedAsyncioTestCase):
    def _service(self, **params) -> SupermemoryPipecatService:
        service = SupermemoryPipecatService(
            api_key="mock_key",
            user_id="user-123",
            params=SupermemoryPipecatService.InputParams(**params),
        )
        service._queue_context_for_storage = lambda messages: None
        return service

    async def test_each_turn_keeps_its_memory_and_tool_steps_do_not_recall(self) -> None:
        service = self._service()
        profile = AsyncMock(
            return_value=SimpleNamespace(profile={"static": ["Likes tea"], "dynamic": []})
        )
        search = AsyncMock(
            side_effect=[
                SimpleNamespace(results=[_search_hit("Plans a trip")]),
                SimpleNamespace(results=[_search_hit("Plans a trip"), _search_hit("Owns a dog")]),
            ]
        )
        service._supermemory_client = SimpleNamespace(profile=profile, search=search)
        system = {"role": "system", "content": "You are helpful."}
        context = _Context([dict(system), {"role": "user", "content": "Hi"}])

        await service._prepare_context(context)
        first_turn = copy.deepcopy(context.messages)
        context.messages.append({"role": "assistant", "content": None, "tool_calls": []})
        await service._prepare_context(context)
        context.messages.append({"role": "assistant", "content": "Hello"})
        context.messages.append({"role": "user", "content": "Any pets?"})
        await service._prepare_context(context)

        self.assertEqual(profile.await_count, 1)
        self.assertEqual(search.await_count, 2)
        self.assertEqual(context.messages[0], system)
        self.assertEqual(context.messages[:2], first_turn)
        self.assertIn("Likes tea", first_turn[1]["content"])
        self.assertIn("[2026-03-04] Plans a trip", first_turn[1]["content"])
        latest = context.messages[-1]["content"]
        self.assertTrue(latest.startswith("Any pets?\n\n<user_memories>"))
        self.assertIn("Owns a dog", latest)
        self.assertNotIn("Likes tea", latest)
        self.assertNotIn("Plans a trip", latest)

    async def test_timed_out_recall_degrades_and_next_turn_retries_profile(self) -> None:
        service = self._service(recall_timeout=0.05)

        async def hang(*args, **kwargs):
            await asyncio.sleep(10)

        service._supermemory_client = SimpleNamespace(profile=hang, search=hang)
        context = _Context([{"role": "user", "content": "Hi"}])
        started = time.monotonic()
        await service._prepare_context(context)

        self.assertLess(time.monotonic() - started, 1)
        self.assertEqual(context.messages, [{"role": "user", "content": "Hi"}])

        profile = AsyncMock(
            return_value=SimpleNamespace(profile={"static": ["Likes tea"], "dynamic": []})
        )
        search = AsyncMock(return_value=SimpleNamespace(results=[]))
        service._supermemory_client = SimpleNamespace(profile=profile, search=search)
        await service._prepare_context(context)
        self.assertEqual(profile.await_count, 0)

        context.messages.append({"role": "assistant", "content": "Hello"})
        context.messages.append({"role": "user", "content": "Again"})
        await service._prepare_context(context)

        self.assertEqual(profile.await_count, 1)
        self.assertEqual(profile.await_args.kwargs["request_options"]["max_retries"], 0)
        self.assertEqual(context.messages[0], {"role": "user", "content": "Hi"})
        self.assertIn("Likes tea", context.messages[-1]["content"])

    async def test_system_mode_keeps_loaded_profile_and_replaces_its_block(self) -> None:
        service = self._service(inject_mode="system")
        profile = AsyncMock(
            return_value=SimpleNamespace(profile={"static": ["Likes tea"], "dynamic": []})
        )
        search = AsyncMock(
            side_effect=[
                SimpleNamespace(results=[_search_hit("Plans a trip")]),
                SimpleNamespace(results=[_search_hit("Owns a dog")]),
            ]
        )
        service._supermemory_client = SimpleNamespace(profile=profile, search=search)
        context = _Context(
            [{"role": "system", "content": "You are helpful."}, {"role": "user", "content": "Hi"}]
        )

        await service._prepare_context(context)
        context.messages.append({"role": "assistant", "content": "Hello"})
        context.messages.append({"role": "user", "content": "Any pets?"})
        await service._prepare_context(context)

        self.assertEqual(profile.await_count, 1)
        system_content = context.messages[0]["content"]
        self.assertTrue(system_content.startswith("You are helpful.\n\n<user_memories>\n"))
        self.assertEqual(system_content.count("<user_memories>"), 1)
        self.assertIn("Likes tea", system_content)
        self.assertIn("[2026-03-04] Owns a dog", system_content)
        self.assertNotIn("Plans a trip", system_content)
        self.assertEqual(context.messages[1], {"role": "user", "content": "Hi"})
        self.assertEqual(context.messages[3], {"role": "user", "content": "Any pets?"})

    async def test_storage_drain_is_bounded(self) -> None:
        service = self._service(storage_drain_timeout=0.05)

        async def hang(*args, **kwargs):
            await asyncio.sleep(10)

        service._supermemory_client = SimpleNamespace(add=hang)
        SupermemoryPipecatService._queue_context_for_storage(
            service, [{"role": "user", "content": "Hi"}]
        )
        started = time.monotonic()
        await service._drain_storage_queue()

        self.assertLess(time.monotonic() - started, 1)
        self.assertEqual(len(service._storage_queue), 1)
