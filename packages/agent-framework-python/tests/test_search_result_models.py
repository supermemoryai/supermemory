"""Regression tests: search results arrive as SDK model objects.

middleware.py and context_provider.py pass ``response.search_results.results``
into ``deduplicate_memories``. The Supermemory SDK returns those as Pydantic
model objects, not dicts. ``extract_memory_text`` previously only handled dict
and str, so models fell through to ``None`` and were silently dropped -- in
query/full mode no search memories were injected. These tests feed dict-less
model stand-ins through the dedup path.
"""

from supermemory_agent_framework.utils import deduplicate_memories


class _FakeSearchResult:
    """Mimics a Supermemory SDK search result: attribute access and
    ``model_dump()`` but no dict ``.get()``."""

    def __init__(self, memory):
        self.memory = memory

    def model_dump(self, by_alias=False):
        return {"memory": self.memory}


class _AttrOnlyResult:
    """A model-like object without model_dump(), to exercise the attribute
    fallback."""

    def __init__(self, memory):
        self.memory = memory


def test_model_results_are_extracted_and_deduped():
    result = deduplicate_memories(
        search_results=[
            _FakeSearchResult("likes python"),
            _FakeSearchResult("likes python"),  # duplicate, dropped
            _FakeSearchResult("prefers async"),
        ]
    )
    assert result.search_results == ["likes python", "prefers async"]


def test_model_without_model_dump_falls_back_to_attribute():
    result = deduplicate_memories(search_results=[_AttrOnlyResult("via attr")])
    assert result.search_results == ["via attr"]


def test_dict_results_still_supported():
    result = deduplicate_memories(search_results=[{"memory": "from dict"}])
    assert result.search_results == ["from dict"]
