"""Unit tests for temporal query gating."""

from typing import Dict, List

import pytest

import sys
import os

SRC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from supermemory_openai.tools import SupermemoryTools  # type: ignore  # noqa: E402


class _DummySearch:
    def __init__(self, recorder: List[Dict[str, object]]):
        self._recorder = recorder

    async def execute(self, **kwargs):
        self._recorder.append(kwargs)
        return type("Response", (), {"results": []})()


class _DummyMemories:
    async def add(self, **kwargs):
        return type("Response", (), {})()


class _DummySupermemory:
    def __init__(self, recorder: List[Dict[str, object]]):
        self.search = _DummySearch(recorder)
        self.memories = _DummyMemories()


@pytest.mark.asyncio
async def test_temporal_parameters_omitted_when_flag_disabled(monkeypatch: pytest.MonkeyPatch):
    recorded: List[Dict[str, object]] = []

    monkeypatch.setattr(
        "supermemory_openai.tools.supermemory.Supermemory",
        lambda *args, **kwargs: _DummySupermemory(recorded),
    )

    tools = SupermemoryTools(
        "test-api-key",
        {
            "enable_temporal_queries": False,
        },
    )

    await tools.search_memories(
        information_to_get="beta feature check",
        as_of="2024-01-01T00:00:00Z",
        time_window={"from": "2024-01-01T00:00:00Z", "to": "2024-01-05T00:00:00Z"},
    )

    assert len(recorded) == 1
    call = recorded[0]
    assert "asOf" not in call
    assert "validFromGte" not in call
    assert "validUntilLte" not in call


@pytest.mark.asyncio
async def test_temporal_parameters_forwarded_when_flag_enabled(monkeypatch: pytest.MonkeyPatch):
    recorded: List[Dict[str, object]] = []

    monkeypatch.setattr(
        "supermemory_openai.tools.supermemory.Supermemory",
        lambda *args, **kwargs: _DummySupermemory(recorded),
    )

    as_of = "2024-03-10T12:34:56Z"
    valid_from = "2024-03-01T00:00:00Z"
    valid_until = "2024-03-31T23:59:59Z"

    tools = SupermemoryTools(
        "test-api-key",
        {
            "enable_temporal_queries": True,
        },
    )

    await tools.search_memories(
        information_to_get="project timeline",
        as_of=as_of,
        time_window={"from": valid_from, "to": valid_until},
    )

    assert len(recorded) == 1
    call = recorded[0]
    assert call.get("asOf") == as_of
    assert call.get("validFromGte") == valid_from
    assert call.get("validUntilLte") == valid_until


@pytest.mark.asyncio
async def test_temporal_parameters_handle_partial_window(monkeypatch: pytest.MonkeyPatch):
    recorded: List[Dict[str, object]] = []

    monkeypatch.setattr(
        "supermemory_openai.tools.supermemory.Supermemory",
        lambda *args, **kwargs: _DummySupermemory(recorded),
    )

    tools = SupermemoryTools(
        "test-api-key",
        {
            "enable_temporal_queries": True,
        },
    )

    await tools.search_memories(
        information_to_get="partial window",
        time_window={"from": "2024-04-01T00:00:00Z"},
    )

    assert len(recorded) == 1
    call = recorded[0]
    assert call.get("validFromGte") == "2024-04-01T00:00:00Z"
    assert "validUntilLte" not in call
    assert "asOf" not in call
