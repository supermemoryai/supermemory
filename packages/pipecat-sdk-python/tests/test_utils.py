"""Tests for the memory dedup/format helpers.

Search results reach these helpers either as plain camelCase dicts (profile
endpoint) or as typed SDK result models (snake_case attributes, no dict
interface). Both shapes must be handled — see issue #1266.
"""

from __future__ import annotations

import unittest
from types import SimpleNamespace

from .conftest import _install_test_stubs

_install_test_stubs()

from supermemory_pipecat.utils import deduplicate_memories, format_memories_to_text


def _model_result(memory, updated_at=None):
    """Stand-in for an SDK result model: attribute access only, no .get()."""
    return SimpleNamespace(memory=memory, updated_at=updated_at)


class TestDeduplicateMemories(unittest.TestCase):
    def test_dict_results_with_camel_case_keys(self) -> None:
        results = [{"memory": "User prefers async", "updatedAt": "2026-01-01T00:00:00Z"}]

        deduplicated = deduplicate_memories(static=[], dynamic=[], search_results=results)

        self.assertEqual(deduplicated["search_results"], results)

    def test_model_results_use_attribute_access(self) -> None:
        result = _model_result("User prefers async")

        deduplicated = deduplicate_memories(static=[], dynamic=[], search_results=[result])

        self.assertEqual(deduplicated["search_results"], [result])

    def test_model_results_deduplicate_against_profile(self) -> None:
        deduplicated = deduplicate_memories(
            static=["User prefers async"],
            dynamic=[],
            search_results=[
                _model_result("User prefers async"),
                _model_result("User works remotely"),
            ],
        )

        self.assertEqual(deduplicated["static"], ["User prefers async"])
        self.assertEqual(
            [r.memory for r in deduplicated["search_results"]],
            ["User works remotely"],
        )

    def test_results_without_memory_are_dropped(self) -> None:
        deduplicated = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[_model_result(None), {"updatedAt": "2026-01-01T00:00:00Z"}],
        )

        self.assertEqual(deduplicated["search_results"], [])


class TestFormatMemoriesToText(unittest.TestCase):
    def _format(self, search_results) -> str:
        return format_memories_to_text(
            {"static": [], "dynamic": [], "search_results": search_results}
        )

    def test_dict_results_render_memory_and_relative_time(self) -> None:
        text = self._format(
            [{"memory": "User prefers async", "updatedAt": "2020-01-05T00:00:00Z"}]
        )

        self.assertIn("- [5 Jan, 2020] User prefers async", text)

    def test_model_results_render_memory_and_relative_time(self) -> None:
        text = self._format([_model_result("User prefers async", "2020-01-05T00:00:00Z")])

        self.assertIn("- [5 Jan, 2020] User prefers async", text)

    def test_model_results_without_timestamp_render_memory_only(self) -> None:
        text = self._format([_model_result("User prefers async")])

        self.assertIn("- User prefers async", text)

    def test_string_results_render_verbatim(self) -> None:
        text = self._format(["User prefers async"])

        self.assertIn("- User prefers async", text)
