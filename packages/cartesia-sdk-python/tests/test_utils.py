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


if __name__ == "__main__":
    unittest.main()
