from __future__ import annotations

import unittest
from types import SimpleNamespace

from supermemory_pipecat.utils import (
    deduplicate_memories,
    format_memories_to_text,
)


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
