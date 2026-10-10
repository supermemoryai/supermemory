from __future__ import annotations

import sys
import types
import unittest
from types import SimpleNamespace


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

from supermemory_cartesia.utils import (
    deduplicate_memories,
    format_memories_to_text,
    get_last_user_message,
)


class TestGetLastUserMessage(unittest.TestCase):
    def test_returns_the_most_recent_user_message(self) -> None:
        messages = [
            {"role": "user", "content": "first"},
            {"role": "assistant", "content": "reply"},
            {"role": "user", "content": "second"},
        ]

        self.assertEqual(get_last_user_message(messages), "second")

    def test_skips_entries_without_role_or_content(self) -> None:
        # Tool-call turns and provider events carry neither key, and reading
        # them positionally used to raise KeyError instead of skipping them.
        messages = [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "tool_calls": []},
            {"content": "provider event"},
            {"role": "user"},
        ]

        self.assertEqual(get_last_user_message(messages), "hello")

    def test_skips_non_string_content(self) -> None:
        messages = [{"role": "user", "content": [{"type": "text", "text": "hello"}]}]

        self.assertIsNone(get_last_user_message(messages))


class TestDeduplicateMemories(unittest.TestCase):
    def test_keeps_plain_string_search_results(self) -> None:
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=["User prefers tea"],
        )

        self.assertEqual(result["search_results"], ["User prefers tea"])
        self.assertIn("User prefers tea", format_memories_to_text(result))

    def test_still_reads_the_memory_field_of_models_and_dicts(self) -> None:
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[
                SimpleNamespace(memory="From a model"),
                {"chunk": "From a dict"},
            ],
        )

        self.assertEqual(len(result["search_results"]), 2)
        rendered = format_memories_to_text(result)
        self.assertIn("From a model", rendered)
        self.assertIn("From a dict", rendered)

    def test_deduplicates_a_string_result_already_in_the_profile(self) -> None:
        fact = "User is allergic to peanuts"
        result = deduplicate_memories(
            static=[fact],
            dynamic=[],
            search_results=[fact],
        )

        self.assertEqual(result["static"], [fact])
        self.assertEqual(result["search_results"], [])


class TestSearchResultExtraction(unittest.TestCase):
    """v4 hybrid search returns chunk hits whose `memory` field is empty.

    `_field` stops at the first value that is not None, so those hits used to
    resolve to "" and were dropped by dedup -- or, when they survived, rendered
    as an empty bullet. The TypeScript `getMemoryText` takes the first
    non-empty field instead, and the other Supermemory Python SDKs match it.
    """

    def test_falls_through_to_chunk_when_memory_is_empty(self) -> None:
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[{"memory": "", "chunk": "The user's dog is called Rex"}],
        )

        self.assertEqual(len(result["search_results"]), 1)
        self.assertIn("The user's dog is called Rex", format_memories_to_text(result))

    def test_falls_through_to_chunk_when_memory_is_whitespace(self) -> None:
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[{"memory": "   ", "chunk": "Chunk body"}],
        )

        self.assertEqual(len(result["search_results"]), 1)
        self.assertIn("Chunk body", format_memories_to_text(result))

    def test_falls_through_on_models_too(self) -> None:
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[SimpleNamespace(memory="", chunk="Chunk body")],
        )

        self.assertEqual(len(result["search_results"]), 1)
        self.assertIn("Chunk body", format_memories_to_text(result))

    def test_never_renders_an_empty_bullet(self) -> None:
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[
                {
                    "memory": "",
                    "chunk": "Chunk body",
                    "updatedAt": "2020-01-01T00:00:00Z",
                }
            ],
        )

        rendered = format_memories_to_text(result)
        self.assertIn("Chunk body", rendered)
        for line in rendered.splitlines():
            if line.startswith("- "):
                self.assertNotRegex(line, r"^- (\[[^\]]*\] )?$")

    def test_memory_still_wins_over_chunk(self) -> None:
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[{"memory": "Memory body", "chunk": "Chunk body"}],
        )

        rendered = format_memories_to_text(result)
        self.assertIn("Memory body", rendered)
        self.assertNotIn("Chunk body", rendered)

    def test_entry_with_no_usable_text_is_still_dropped(self) -> None:
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[{"memory": "", "chunk": ""}, {}, None],
        )

        self.assertEqual(result["search_results"], [])


if __name__ == "__main__":
    unittest.main()
