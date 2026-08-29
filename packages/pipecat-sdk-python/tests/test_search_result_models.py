"""Regression tests: profile search results arrive as SDK model objects.

The Supermemory SDK returns ``response.search_results.results`` as Pydantic
model objects, not dicts. Calling ``.get("memory")`` on a model raises
AttributeError, which crashed ``deduplicate_memories`` on every non-empty
search (the default ``mode="full"`` path). These tests reproduce that path
with a dict-less model stand-in.
"""

import unittest

from supermemory_pipecat.utils import deduplicate_memories, format_memories_to_text


class _FakeSearchResult:
    """Mimics a Supermemory SDK search result: attribute access and
    ``model_dump()`` but deliberately no dict ``.get()``."""

    def __init__(self, memory, updated_at=None):
        self.memory = memory
        self.updatedAt = updated_at

    def model_dump(self, by_alias=False):
        data = {"memory": self.memory}
        if self.updatedAt is not None:
            data["updatedAt"] = self.updatedAt
        return data


class TestSearchResultModels(unittest.TestCase):
    def test_model_results_do_not_crash_and_dedupe(self):
        results = [
            _FakeSearchResult("likes python", "2020-01-01T00:00:00Z"),
            _FakeSearchResult("likes python"),  # duplicate, dropped
            _FakeSearchResult("prefers async"),
        ]
        dedup = deduplicate_memories(static=[], dynamic=[], search_results=results)
        self.assertEqual(
            [r["memory"] for r in dedup["search_results"]],
            ["likes python", "prefers async"],
        )

    def test_model_results_render_to_text(self):
        results = [_FakeSearchResult("likes python", "2020-01-01T00:00:00Z")]
        dedup = deduplicate_memories(static=[], dynamic=[], search_results=results)
        self.assertIn("likes python", format_memories_to_text(dedup))

    def test_dict_results_still_supported(self):
        results = [{"memory": "from dict"}]
        dedup = deduplicate_memories(static=[], dynamic=[], search_results=results)
        self.assertEqual([r["memory"] for r in dedup["search_results"]], ["from dict"])


if __name__ == "__main__":
    unittest.main()
