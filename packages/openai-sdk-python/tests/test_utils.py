"""Tests for shared middleware utilities."""

from supermemory_openai.utils import deduplicate_memories


def test_deduplicates_normalized_fact_variants() -> None:
    result = deduplicate_memories(
        static=[
            {"memory": "User likes Python"},
            {"memory": " user likes python "},
        ],
        dynamic=[{"memory": "[2026-08-10] USER LIKES PYTHON"}],
        search_results=[],
    )

    assert result.static == ["User likes Python"]
    assert result.dynamic == []
