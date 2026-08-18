"""Regression tests for pydantic/dict memory helpers (#1266)."""

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

from supermemory_cartesia.utils import deduplicate_memories, format_memories_to_text


class TestDeduplicateMemories(unittest.TestCase):
    def test_accepts_dict_search_results(self) -> None:
        result = deduplicate_memories(
            static=["User likes Python"],
            dynamic=[],
            search_results=[{"memory": "User prefers async", "updatedAt": "2026-01-01T00:00:00Z"}],
        )
        self.assertEqual(result["static"], ["User likes Python"])
        self.assertEqual(len(result["search_results"]), 1)

    def test_accepts_pydantic_like_search_results(self) -> None:
        # Mirrors supermemory.types.search_memories_response.Result
        model = SimpleNamespace(
            id="mem_1",
            similarity=0.9,
            memory="User prefers async",
            updated_at="2026-01-01T00:00:00Z",
        )
        result = deduplicate_memories(
            static=[],
            dynamic=[],
            search_results=[model],
        )
        self.assertEqual(len(result["search_results"]), 1)
        self.assertIs(result["search_results"][0], model)

    def test_dedupes_model_against_static_string(self) -> None:
        model = SimpleNamespace(memory="User likes Python", updated_at=None)
        result = deduplicate_memories(
            static=["User likes Python"],
            dynamic=[],
            search_results=[model],
        )
        self.assertEqual(result["search_results"], [])

    def test_dedupes_normalized_fact_variants(self) -> None:
        result = deduplicate_memories(
            static=["User likes Python", " user likes python "],
            dynamic=["[2026-08-10] USER LIKES PYTHON"],
            search_results=[],
        )
        self.assertEqual(result["static"], ["User likes Python"])
        self.assertEqual(result["dynamic"], [])


class TestFormatMemoriesToText(unittest.TestCase):
    def test_formats_pydantic_like_search_results(self) -> None:
        text = format_memories_to_text(
            {
                "static": [],
                "dynamic": [],
                "search_results": [
                    SimpleNamespace(
                        memory="User prefers async",
                        updated_at="2020-01-01T00:00:00Z",
                    )
                ],
            }
        )
        self.assertIn("User prefers async", text)
        self.assertIn("Relevant Memories", text)

    def test_formats_search_execute_content_field(self) -> None:
        text = format_memories_to_text(
            {
                "static": [],
                "dynamic": [],
                "search_results": [
                    SimpleNamespace(
                        content="User owns a telescope",
                        updated_at="2020-01-01T00:00:00Z",
                        memory=None,
                    )
                ],
            }
        )
        self.assertIn("User owns a telescope", text)


if __name__ == "__main__":
    unittest.main()
