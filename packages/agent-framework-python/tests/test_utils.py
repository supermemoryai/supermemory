"""Tests for utility functions."""

import pytest

from supermemory_agent_framework.utils import (
    DeduplicatedMemories,
    SimpleLogger,
    convert_profile_to_markdown,
    create_logger,
    deduplicate_memories,
)


class TestDeduplicateMemories:
    def test_empty_inputs(self) -> None:
        result = deduplicate_memories()
        assert result.static == []
        assert result.dynamic == []
        assert result.search_results == []

    def test_static_only(self) -> None:
        result = deduplicate_memories(
            static=[{"memory": "User likes Python"}],
        )
        assert result.static == ["User likes Python"]
        assert result.dynamic == []
        assert result.search_results == []

    def test_deduplication_priority(self) -> None:
        result = deduplicate_memories(
            static=[{"memory": "User likes Python"}],
            dynamic=[{"memory": "User likes Python"}, {"memory": "User works remotely"}],
            search_results=[{"memory": "User likes Python"}, {"memory": "User prefers async"}],
        )
        assert result.static == ["User likes Python"]
        assert result.dynamic == ["User works remotely"]
        assert result.search_results == ["User prefers async"]

    def test_string_format(self) -> None:
        result = deduplicate_memories(
            static=["User likes Python"],
            dynamic=["User works remotely"],
        )
        assert result.static == ["User likes Python"]
        assert result.dynamic == ["User works remotely"]

    def test_empty_strings_filtered(self) -> None:
        result = deduplicate_memories(
            static=["", "  ", "User likes Python"],
        )
        assert result.static == ["User likes Python"]

    def test_none_items_filtered(self) -> None:
        result = deduplicate_memories(
            static=[None, {"memory": "valid"}],
        )
        assert result.static == ["valid"]


class TestConvertProfileToMarkdown:
    def test_empty_profile(self) -> None:
        result = convert_profile_to_markdown({"profile": {}})
        assert result == ""

    def test_static_only(self) -> None:
        result = convert_profile_to_markdown(
            {"profile": {"static": ["Likes Python", "Lives in SF"]}}
        )
        assert "## Static Profile" in result
        assert "- Likes Python" in result
        assert "- Lives in SF" in result

    def test_both_sections(self) -> None:
        result = convert_profile_to_markdown(
            {
                "profile": {
                    "static": ["Likes Python"],
                    "dynamic": ["Asked about AI"],
                }
            }
        )
        assert "## Static Profile" in result
        assert "## Dynamic Profile" in result


class TestLogger:
    def test_verbose_logger(self, capsys: pytest.CaptureFixture[str]) -> None:
        logger = SimpleLogger(verbose=True)
        logger.info("test message")
        captured = capsys.readouterr()
        assert "[supermemory] test message" in captured.out

    def test_silent_logger(self, capsys: pytest.CaptureFixture[str]) -> None:
        logger = SimpleLogger(verbose=False)
        logger.info("test message")
        captured = capsys.readouterr()
        assert captured.out == ""

    def test_error_prefix(self, capsys: pytest.CaptureFixture[str]) -> None:
        logger = SimpleLogger(verbose=True)
        logger.error("something failed")
        captured = capsys.readouterr()
        assert "ERROR:" in captured.out

    def test_create_logger(self) -> None:
        logger = create_logger(True)
        assert isinstance(logger, SimpleLogger)
