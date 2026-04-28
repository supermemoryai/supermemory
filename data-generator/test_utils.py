"""Tests for utils.py — shared utilities."""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

from utils import (
    count_tokens,
    estimate_chars_for_tokens,
    get_semaphore,
    parse_json_response,
    truncate_to_tokens,
    unwrap_json_list,
)


# ---------------------------------------------------------------------------
# Tests: truncate_to_tokens
# ---------------------------------------------------------------------------


class TestTruncateToTokens:
    def test_short_text_unchanged(self):
        text = "Hello world"
        assert truncate_to_tokens(text, 1000) == text

    def test_long_text_truncated(self):
        text = "word " * 5000
        result = truncate_to_tokens(text, 100)
        assert count_tokens(result) <= 100

    def test_empty_text(self):
        assert truncate_to_tokens("", 100) == ""

    def test_exact_boundary(self):
        text = "a " * 50
        tokens = count_tokens(text)
        assert truncate_to_tokens(text, tokens) == text

    def test_add_suffix_false_no_suffix(self):
        """Default (add_suffix=False) should not append the truncation marker."""
        text = "word " * 5000
        result = truncate_to_tokens(text, 100)
        assert "[… truncated …]" not in result

    def test_add_suffix_true_appends_marker(self):
        """add_suffix=True should append truncation marker."""
        text = "word " * 5000
        result = truncate_to_tokens(text, 100, add_suffix=True)
        assert result.endswith("[… truncated …]")

    def test_add_suffix_no_marker_if_not_truncated(self):
        """Short text should not get the suffix even if add_suffix=True."""
        text = "Short text."
        result = truncate_to_tokens(text, 1000, add_suffix=True)
        assert result == text

    def test_add_suffix_sentence_boundary(self):
        """add_suffix path should try to break at a sentence boundary."""
        text = "First sentence. Second sentence. Third sentence. " * 500
        result = truncate_to_tokens(text, 10, add_suffix=True)
        assert result.endswith("[… truncated …]")
        # Should have broken at a boundary
        body = result.replace("\n\n[… truncated …]", "")
        assert body.endswith(". ") or body.endswith(".")


# ---------------------------------------------------------------------------
# Tests: unwrap_json_list
# ---------------------------------------------------------------------------


class TestUnwrapJsonList:
    def test_bare_list(self):
        data = [{"id": "a"}, {"id": "b"}]
        assert unwrap_json_list(data) == data

    def test_dict_with_expected_key(self):
        data = {"files": [{"id": "a"}]}
        assert unwrap_json_list(data, expected_keys=("files",)) == [{"id": "a"}]

    def test_dict_fallback_to_any_list(self):
        data = {"unknown_key": [{"id": "a"}]}
        assert unwrap_json_list(data) == [{"id": "a"}]

    def test_dict_no_list_values_raises(self):
        data = {"key": "string_value"}
        with pytest.raises(ValueError, match="Expected a JSON array"):
            unwrap_json_list(data)

    def test_unexpected_type_raises(self):
        with pytest.raises(ValueError, match="Unexpected response type"):
            unwrap_json_list("a string")

    def test_expected_keys_tried_in_order(self):
        data = {"entries": [{"id": "e"}], "files": [{"id": "f"}]}
        result = unwrap_json_list(data, expected_keys=("files", "entries"))
        assert result == [{"id": "f"}]

    def test_empty_list(self):
        assert unwrap_json_list([]) == []

    def test_expected_keys_skip_non_list(self):
        data = {"files": "not a list", "entries": [{"id": "a"}]}
        result = unwrap_json_list(data, expected_keys=("files", "entries"))
        assert result == [{"id": "a"}]


# ---------------------------------------------------------------------------
# Tests: estimate_chars_for_tokens
# ---------------------------------------------------------------------------


class TestEstimateCharsForTokens:
    def test_basic(self):
        assert estimate_chars_for_tokens(100) == 400
        assert estimate_chars_for_tokens(0) == 0

    def test_negative(self):
        assert estimate_chars_for_tokens(-1) == -4


# ---------------------------------------------------------------------------
# Tests: get_semaphore
# ---------------------------------------------------------------------------


class TestGetSemaphore:
    def test_returns_semaphore(self):
        import utils

        # Reset global state
        utils._semaphore = None
        utils._semaphore_capacity = 0
        sem = get_semaphore(5)
        assert isinstance(sem, asyncio.Semaphore)
        assert sem._value == 5

    def test_reuses_semaphore_with_same_capacity(self):
        import utils

        utils._semaphore = None
        utils._semaphore_capacity = 0
        sem1 = get_semaphore(5)
        sem2 = get_semaphore(5)
        assert sem1 is sem2

    def test_recreates_semaphore_with_different_capacity(self):
        import utils

        utils._semaphore = None
        utils._semaphore_capacity = 0
        sem1 = get_semaphore(5)
        sem2 = get_semaphore(10)
        assert sem1 is not sem2
        assert sem2._value == 10

    def test_does_not_recreate_on_acquired_permits(self):
        """The semaphore should NOT be recreated when permits are acquired.

        This was the bug: the old code checked ``_value != max_concurrent``
        which triggers after any ``acquire()``.
        """
        import utils

        utils._semaphore = None
        utils._semaphore_capacity = 0

        async def _run():
            sem = get_semaphore(3)
            await sem.acquire()
            # After acquire, _value is 2, but capacity is still 3
            sem2 = get_semaphore(3)
            assert sem is sem2, "Semaphore should be reused despite acquired permits"
            sem.release()

        asyncio.run(_run())


# ---------------------------------------------------------------------------
# Tests: parse_json_response
# ---------------------------------------------------------------------------


class TestParseJsonResponse:
    def test_bare_json(self):
        assert parse_json_response('{"key": "value"}') == {"key": "value"}

    def test_json_with_markdown_fences(self):
        text = "```json\n{\"key\": \"value\"}\n```"
        assert parse_json_response(text) == {"key": "value"}

    def test_json_array(self):
        assert parse_json_response('[1, 2, 3]') == [1, 2, 3]

    def test_json_embedded_in_text(self):
        text = "Here is the result: {\"key\": \"value\"} and some trailing text."
        assert parse_json_response(text) == {"key": "value"}

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Could not parse JSON"):
            parse_json_response("not json at all")
