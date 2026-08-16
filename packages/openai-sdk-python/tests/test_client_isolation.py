"""Regression tests for shared OpenAI client middleware isolation."""

from __future__ import annotations

import asyncio
import os
from types import SimpleNamespace
from typing import Any, Generator, Literal, Optional
from unittest.mock import AsyncMock, Mock, patch

import pytest

from supermemory_openai import OpenAIMiddlewareOptions, with_supermemory


def middleware_options(
    container_tag: str,
    add_memory: Literal["always", "never"] = "never",
) -> OpenAIMiddlewareOptions:
    return OpenAIMiddlewareOptions(
        container_tag=container_tag,
        custom_id=f"thread-{container_tag}",
        add_memory=add_memory,
    )


def create_sync_client() -> tuple[Any, Mock]:
    create = Mock(return_value={"id": "chat-response"})
    completions = SimpleNamespace(create=create, marker="completions-marker")
    chat = SimpleNamespace(completions=completions, marker="chat-marker")
    return SimpleNamespace(chat=chat), create


def create_async_client() -> tuple[Any, AsyncMock]:
    create = AsyncMock(return_value={"id": "chat-response"})
    completions = SimpleNamespace(create=create)
    chat = SimpleNamespace(completions=completions)
    return SimpleNamespace(chat=chat), create


class RawResponse:
    def __init__(self, label: str) -> None:
        self.label = label

    def parse(self) -> str:
        return f"parsed-{self.label}"


class SyncStreamContext:
    def __init__(self, label: str) -> None:
        self.label = label

    def __enter__(self) -> "SyncStreamContext":
        return self

    def __exit__(self, *args: Any) -> None:
        return None


class AsyncStreamContext:
    def __init__(self, label: str) -> None:
        self.label = label

    async def __aenter__(self) -> "AsyncStreamContext":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None


def attach_response_variants(
    client: Any,
    raw_create_factory: Any,
    streaming_create_factory: Any,
) -> dict[str, Any]:
    calls: dict[str, Any] = {}

    def completion_resource(label: str, factory: Any) -> Any:
        create = factory(label)
        calls[label] = create
        return SimpleNamespace(create=create)

    client.chat.completions.with_raw_response = completion_resource(
        "completions-raw", raw_create_factory
    )
    client.chat.with_raw_response = SimpleNamespace(
        completions=completion_resource("chat-raw", raw_create_factory)
    )
    client.with_raw_response = SimpleNamespace(
        chat=SimpleNamespace(
            completions=completion_resource("client-raw", raw_create_factory)
        )
    )
    client.chat.completions.with_streaming_response = completion_resource(
        "completions-stream", streaming_create_factory
    )
    client.chat.with_streaming_response = SimpleNamespace(
        completions=completion_resource("chat-stream", streaming_create_factory)
    )
    client.with_streaming_response = SimpleNamespace(
        chat=SimpleNamespace(
            completions=completion_resource("client-stream", streaming_create_factory)
        )
    )
    return calls


def response_variant_creates(client: Any, name: str) -> list[Any]:
    return [
        getattr(client.chat.completions, name).create,
        getattr(client.chat, name).completions.create,
        getattr(client, name).chat.completions.create,
    ]


@pytest.fixture(autouse=True)  # type: ignore[untyped-decorator]
def supermemory_api_key() -> Generator[None, None, None]:
    with patch.dict(os.environ, {"SUPERMEMORY_API_KEY": "test-key"}):
        yield


def test_shared_sync_client_does_not_stack_tenant_middleware() -> None:
    base_client, original_create = create_sync_client()
    lookups: list[str] = []

    async def fake_prompt(
        messages: list[Any],
        container_tag: str,
        logger: Any,
        mode: Any,
        api_key: str,
    ) -> list[Any]:
        lookups.append(container_tag)
        return [
            {"role": "system", "content": f"secret-{container_tag}"},
            *messages,
        ]

    with patch(
        "supermemory_openai.middleware.supermemory.Supermemory",
        return_value=Mock(),
    ), patch(
        "supermemory_openai.middleware.add_system_prompt",
        side_effect=fake_prompt,
    ):
        tenant_a: Any = with_supermemory(
            base_client,
            middleware_options("tenant-a"),
        )
        tenant_b: Any = with_supermemory(
            base_client,
            middleware_options("tenant-b"),
        )

        assert base_client.chat.completions.create is original_create
        assert tenant_a.chat is not base_client.chat
        assert tenant_b.chat.marker == "chat-marker"
        assert tenant_b.chat.completions.marker == "completions-marker"

        tenant_b.chat.completions.create(
            model="gpt-test",
            messages=[{"role": "user", "content": "private"}],
        )

        assert lookups == ["tenant-b"]
        messages = original_create.call_args.kwargs["messages"]
        assert messages[0]["content"] == "secret-tenant-b"
        assert all("tenant-a" not in str(message) for message in messages)

        base_client.chat.completions.create(
            model="gpt-test",
            messages=[{"role": "user", "content": "unwrapped"}],
        )
        assert lookups == ["tenant-b"]


def test_rewrapping_a_facade_recovers_the_pristine_client() -> None:
    base_client, original_create = create_sync_client()
    lookups: list[str] = []

    async def fake_prompt(
        messages: list[Any],
        container_tag: str,
        logger: Any,
        mode: Any,
        api_key: str,
    ) -> list[Any]:
        lookups.append(container_tag)
        return [
            {"role": "system", "content": f"secret-{container_tag}"},
            *messages,
        ]

    with patch(
        "supermemory_openai.middleware.supermemory.Supermemory",
        return_value=Mock(),
    ), patch(
        "supermemory_openai.middleware.add_system_prompt",
        side_effect=fake_prompt,
    ):
        tenant_a: Any = with_supermemory(
            base_client,
            middleware_options("tenant-a"),
        )
        tenant_b: Any = with_supermemory(
            tenant_a,
            middleware_options("tenant-b"),
        )

        tenant_b.chat.completions.create(
            model="gpt-test",
            messages=[{"role": "user", "content": "private"}],
        )

        assert lookups == ["tenant-b"]
        assert original_create.call_count == 1
        assert base_client.chat.completions.create is original_create


def test_raw_and_streaming_response_facades_remain_memory_aware() -> None:
    base_client, _ = create_sync_client()
    calls = attach_response_variants(
        base_client,
        lambda label: Mock(return_value=RawResponse(label)),
        lambda label: Mock(return_value=SyncStreamContext(label)),
    )
    lookups: list[str] = []

    async def fake_prompt(
        messages: list[Any],
        container_tag: str,
        logger: Any,
        mode: Any,
        api_key: str,
    ) -> list[Any]:
        lookups.append(container_tag)
        return [
            {"role": "system", "content": f"secret-{container_tag}"},
            *messages,
        ]

    with patch(
        "supermemory_openai.middleware.supermemory.Supermemory",
        return_value=Mock(),
    ), patch(
        "supermemory_openai.middleware.add_system_prompt",
        side_effect=fake_prompt,
    ):
        tenant_b: Any = with_supermemory(
            base_client,
            middleware_options("tenant-b"),
        )

        for create in response_variant_creates(tenant_b, "with_raw_response"):
            response = create(
                model="gpt-test",
                messages=[{"role": "user", "content": "raw"}],
            )
            assert response.parse().startswith("parsed-")

        for create in response_variant_creates(tenant_b, "with_streaming_response"):
            with create(
                model="gpt-test",
                messages=[{"role": "user", "content": "streaming"}],
            ) as stream:
                assert stream.label.endswith("stream")

        assert lookups == ["tenant-b"] * 6
        for create in calls.values():
            assert "secret-tenant-b" in str(create.call_args.kwargs["messages"])


def test_async_raw_and_streaming_response_prefixes_remain_memory_aware() -> None:
    base_client, _ = create_async_client()
    calls = attach_response_variants(
        base_client,
        lambda label: AsyncMock(return_value=RawResponse(label)),
        lambda label: Mock(return_value=AsyncStreamContext(label)),
    )
    lookups: list[str] = []

    async def fake_prompt(
        messages: list[Any],
        container_tag: str,
        logger: Any,
        mode: Any,
        api_key: str,
    ) -> list[Any]:
        lookups.append(container_tag)
        return [
            {"role": "system", "content": f"secret-{container_tag}"},
            *messages,
        ]

    async def call_raw(create: Any) -> None:
        response = await create(
            model="gpt-test",
            messages=[{"role": "user", "content": "raw"}],
        )
        assert response.parse().startswith("parsed-")

    async def consume_stream(stream_context: Any) -> None:
        async with stream_context as stream:
            assert stream.label.endswith("stream")

    with patch(
        "supermemory_openai.middleware.supermemory.Supermemory",
        return_value=Mock(),
    ), patch(
        "supermemory_openai.middleware.add_system_prompt",
        side_effect=fake_prompt,
    ):
        tenant_b: Any = with_supermemory(
            base_client,
            middleware_options("tenant-b"),
        )

        for create in response_variant_creates(tenant_b, "with_raw_response"):
            asyncio.run(call_raw(create))

        for create in response_variant_creates(tenant_b, "with_streaming_response"):
            stream_context = create(
                model="gpt-test",
                messages=[{"role": "user", "content": "streaming"}],
            )
            asyncio.run(consume_stream(stream_context))

        assert lookups == ["tenant-b"] * 6
        for create in calls.values():
            assert "secret-tenant-b" in str(create.call_args.kwargs["messages"])


@pytest.mark.asyncio  # type: ignore[untyped-decorator]
async def test_shared_async_client_saves_only_for_selected_tenant() -> None:
    base_client, original_create = create_async_client()
    lookups: list[str] = []
    writes: list[tuple[str, Optional[str], str]] = []

    async def fake_prompt(
        messages: list[Any],
        container_tag: str,
        logger: Any,
        mode: Any,
        api_key: str,
    ) -> list[Any]:
        lookups.append(container_tag)
        return [
            {"role": "system", "content": f"secret-{container_tag}"},
            *messages,
        ]

    async def fake_add_memory(
        client: Any,
        container_tag: str,
        content: str,
        custom_id: Optional[str],
        logger: Any,
    ) -> None:
        writes.append((container_tag, custom_id, content))

    with patch(
        "supermemory_openai.middleware.supermemory.Supermemory",
        return_value=Mock(),
    ), patch(
        "supermemory_openai.middleware.add_system_prompt",
        side_effect=fake_prompt,
    ), patch(
        "supermemory_openai.middleware.add_memory_tool",
        side_effect=fake_add_memory,
    ):
        tenant_a: Any = with_supermemory(
            base_client,
            middleware_options("tenant-a", add_memory="always"),
        )
        tenant_b: Any = with_supermemory(
            base_client,
            middleware_options("tenant-b", add_memory="always"),
        )

        await tenant_b.chat.completions.create(
            model="gpt-test",
            messages=[{"role": "user", "content": "private tenant B message"}],
        )
        await tenant_a.wait_for_background_tasks()
        await tenant_b.wait_for_background_tasks()

        assert base_client.chat.completions.create is original_create
        assert lookups == ["tenant-b"]
        assert writes == [
            (
                "tenant-b",
                "conversation:thread-tenant-b",
                "User: private tenant B message",
            )
        ]
        assert original_create.call_count == 1
