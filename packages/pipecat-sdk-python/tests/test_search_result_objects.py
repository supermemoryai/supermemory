"""Regression tests for SDK model-object search results.

The Supermemory SDK returns search results as pydantic models (attribute
access), not dicts. deduplicate_memories used to call r.get() on them,
raising AttributeError and killing memory injection for any user whose
profile lookup returned search results.
"""

from __future__ import annotations

import unittest
from datetime import datetime, timezone
from types import SimpleNamespace

from supermemory_pipecat.utils import (
    deduplicate_memories,
    extract_search_result_fields,
    format_memories_to_text,
)


def _model(memory, updated_at=None):
    """Stand-in for an SDK pydantic Result: attribute access, no .get()."""
    return SimpleNamespace(memory=memory, updated_at=updated_at)


class TestModelObjectSearchResults(unittest.TestCase):
    def test_deduplicates_model_objects_without_crashing(self):
        results = [
            _model("User likes Python"),
            _model("User likes Python"),
            _model("User works remotely"),
        ]
        deduped = deduplicate_memories(static=[], dynamic=[], search_results=results)
        memories = [
            extract_search_result_fields(r)[0] for r in deduped["search_results"]
        ]
        self.assertEqual(memories, ["User likes Python", "User works remotely"])

    def test_profile_entries_still_win_over_model_search_results(self):
        deduped = deduplicate_memories(
            static=["User likes Python"],
            dynamic=[],
            search_results=[
                _model("User likes Python"),
                _model("User prefers async"),
            ],
        )
        self.assertEqual(deduped["static"], ["User likes Python"])
        self.assertEqual(
            [extract_search_result_fields(r)[0] for r in deduped["search_results"]],
            ["User prefers async"],
        )

    def test_format_renders_memory_text_not_object_repr(self):
        deduped = deduplicate_memories(
            static=[], dynamic=[], search_results=[_model("User prefers async")]
        )
        text = format_memories_to_text(deduped)
        self.assertIn("- User prefers async", text)
        self.assertNotIn("namespace", text)

    def test_dict_results_keep_working(self):
        deduped = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[
                {"memory": "From a dict", "updatedAt": "2026-01-01T00:00:00Z"}
            ],
        )
        text = format_memories_to_text(deduped)
        self.assertIn("From a dict", text)

    def test_extract_handles_datetime_updated_at(self):
        item = _model("x", updated_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
        memory, updated_at = extract_search_result_fields(item)
        self.assertEqual(memory, "x")
        self.assertTrue(updated_at.startswith("2026-01-01"))

    def test_extract_tolerates_missing_fields(self):
        memory, updated_at = extract_search_result_fields(SimpleNamespace())
        self.assertEqual(memory, "")
        self.assertEqual(updated_at, "")


if __name__ == "__main__":
    unittest.main()
