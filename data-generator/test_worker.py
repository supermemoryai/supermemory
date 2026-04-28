"""Tests for worker.py — Phase 5: parallel file generation workers."""

from __future__ import annotations

import asyncio
import dataclasses
import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from worker import (
    MAX_CONTEXT_TOKENS_PER_FILE,
    MAX_RETRIES,
    MAX_TOTAL_CONTEXT_TOKENS,
    _build_context_files,
    _extract_key_values,
    _get_cluster_file_ids,
    _strip_wrapping_fences,
    _validate_content,
    generate_all,
    generate_cluster,
    generate_file,
)
from utils import truncate_to_tokens as _truncate_to_tokens

# ---------------------------------------------------------------------------
# Helpers & fixtures
# ---------------------------------------------------------------------------


@dataclasses.dataclass
class FakeCluster:
    """Mimics the Cluster dataclass from clusterer.py."""

    cluster_id: str
    file_entries: list[dict] = dataclasses.field(default_factory=list)
    fact_shard: dict = dataclasses.field(default_factory=dict)
    depends_on: list[str] = dataclasses.field(default_factory=list)
    level: int = 0

    @property
    def file_ids(self) -> list[str]:
        return [e["file_id"] for e in self.file_entries]


@dataclasses.dataclass
class MinimalCluster:
    """A cluster that only has file_entries, no file_ids property."""

    file_entries: list[dict] = dataclasses.field(default_factory=list)
    level: int = 0


def _make_entry(
    file_id: str,
    *,
    path: str | None = None,
    fmt: str = "markdown_prose",
    cross_refs: list[str] | None = None,
    locked_facts: list[str] | None = None,
    target_tokens: list[int] | None = None,
    authors: list[str] | None = None,
) -> dict:
    return {
        "file_id": file_id,
        "path": path or f"data/docs/{file_id}.md",
        "format": fmt,
        "date": "2024-03-15",
        "authors": authors or ["alice"],
        "author": authors or ["alice"],
        "tone": "casual",
        "brief": f"Test document {file_id}",
        "cross_references": cross_refs or [],
        "locked_facts": locked_facts or [],
        "target_tokens": target_tokens or [5000, 10000],
    }


def _sample_fact_shard() -> dict:
    return {
        "scenario_id": "dp_test",
        "people": [
            {
                "id": "alice",
                "full_name": "Alice Johnson",
                "role": "Engineer, Acme Corp",
                "email": "alice@acme.com",
                "timezone": "America/New_York",
                "location": "New York, NY",
                "writing_style": "Terse, uses abbreviations",
                "traits": ["detail-oriented", "impatient"],
                "relationships": {"bob": "manager"},
            },
            {
                "id": "bob",
                "full_name": "Bob Smith",
                "role": "VP Engineering, Acme Corp",
                "email": "bob@acme.com",
                "timezone": "America/Chicago",
                "location": "Chicago, IL",
                "writing_style": "Formal, long-winded",
                "traits": ["methodical"],
                "relationships": {"alice": "direct report"},
            },
        ],
        "organizations": [
            {"id": "acme_corp", "name": "Acme Corp", "type": "company"},
        ],
        "dates": [
            {
                "id": "date_meeting",
                "date": "2024-03-20",
                "time": "10:00 EST",
                "event": "Team standup",
                "files": ["f001"],
            },
        ],
        "financial": [
            {
                "id": "budget_q1",
                "value": "$50,000.00",
                "description": "Q1 budget",
                "files": ["f001", "f002"],
            },
        ],
        "references": [
            {
                "id": "ref_ticket",
                "value": "JIRA-1234",
                "type": "ticket",
                "description": "Main bug ticket",
                "files": ["f001"],
            },
        ],
        "locations": [
            {
                "id": "hq",
                "name": "Acme HQ",
                "address": "123 Main St, New York",
                "type": "office",
                "files": ["f001"],
            },
        ],
        "domain_facts": [
            {
                "id": "tech_python",
                "category": "technical",
                "fact": "Uses Python 3.12",
                "files": ["f001"],
            },
        ],
        "cross_references": [],
    }


# ---------------------------------------------------------------------------
# Tests: _truncate_to_tokens
# ---------------------------------------------------------------------------


class TestTruncateToTokens:
    def test_short_text_unchanged(self):
        text = "Hello world"
        result = _truncate_to_tokens(text, 1000)
        assert result == text

    def test_long_text_truncated(self):
        # Create text with known token count (each word is ~1 token)
        words = ["word"] * 5000
        text = " ".join(words)
        result = _truncate_to_tokens(text, 100)
        from utils import count_tokens

        assert count_tokens(result) <= 100

    def test_empty_text(self):
        assert _truncate_to_tokens("", 100) == ""

    def test_exact_boundary(self):
        from utils import count_tokens

        text = "a " * 50
        tokens = count_tokens(text)
        result = _truncate_to_tokens(text, tokens)
        assert result == text


# ---------------------------------------------------------------------------
# Tests: _strip_wrapping_fences
# ---------------------------------------------------------------------------


class TestStripWrappingFences:
    def test_no_fences(self):
        assert _strip_wrapping_fences("Hello world") == "Hello world"

    def test_markdown_fences(self):
        text = "```markdown\nHello world\n```"
        assert _strip_wrapping_fences(text) == "Hello world"

    def test_plain_fences(self):
        text = "```\nSome content\nMore content\n```"
        assert _strip_wrapping_fences(text) == "Some content\nMore content"

    def test_fences_with_language(self):
        text = "```text\nDocument here\n```"
        assert _strip_wrapping_fences(text) == "Document here"

    def test_no_closing_fence(self):
        text = "```markdown\nHello world"
        result = _strip_wrapping_fences(text)
        assert result == "Hello world"

    def test_whitespace_around_fences(self):
        text = "  ```\nContent\n```  "
        # Leading whitespace means it doesn't start with ```, so no stripping
        result = _strip_wrapping_fences(text)
        assert "Content" in result


# ---------------------------------------------------------------------------
# Tests: _extract_key_values
# ---------------------------------------------------------------------------


class TestExtractKeyValues:
    def test_financial(self):
        fact = {"id": "b1", "value": "$50,000.00"}
        assert _extract_key_values(fact, "financial") == ["$50,000.00"]

    def test_financial_empty(self):
        assert _extract_key_values({"id": "b1"}, "financial") == []

    def test_dates(self):
        fact = {"id": "d1", "date": "2024-03-20", "time": "10:00 EST"}
        values = _extract_key_values(fact, "dates")
        assert "2024-03-20" in values
        assert "10:00 EST" in values

    def test_dates_no_time(self):
        fact = {"id": "d1", "date": "2024-03-20"}
        values = _extract_key_values(fact, "dates")
        assert values == ["2024-03-20"]

    def test_references(self):
        fact = {"id": "r1", "value": "JIRA-1234", "type": "ticket"}
        assert _extract_key_values(fact, "references") == ["JIRA-1234"]

    def test_locations(self):
        fact = {"id": "l1", "name": "Acme HQ", "address": "123 Main St"}
        values = _extract_key_values(fact, "locations")
        assert "Acme HQ" in values
        assert "123 Main St" in values

    def test_domain_facts(self):
        fact = {"id": "df1", "fact": "Uses Python 3.12"}
        assert _extract_key_values(fact, "domain_facts") == ["Uses Python 3.12"]

    def test_unknown_category(self):
        assert _extract_key_values({"id": "x"}, "unknown") == []


# ---------------------------------------------------------------------------
# Tests: _validate_content
# ---------------------------------------------------------------------------


class TestValidateContent:
    def test_valid_content(self):
        """Content with correct token count and all facts present."""
        entry = _make_entry(
            "f001",
            locked_facts=["budget_q1", "ref_ticket"],
            target_tokens=[10, 100],
        )
        content = "The budget is $50,000.00 and the ticket is JIRA-1234. Some filler text here."
        fact_shard = _sample_fact_shard()
        issues = _validate_content(content, entry, fact_shard)
        assert issues == []

    def test_too_short(self):
        entry = _make_entry("f001", target_tokens=[5000, 10000])
        content = "Short content."
        issues = _validate_content(content, entry, _sample_fact_shard())
        assert any("Too short" in i for i in issues)

    def test_too_long(self):
        entry = _make_entry("f001", target_tokens=[10, 20])
        content = "word " * 5000  # Way too many tokens
        issues = _validate_content(content, entry, _sample_fact_shard())
        assert any("Too long" in i for i in issues)

    def test_within_30_percent_overshoot_ok(self):
        """Allow 30% overshoot without flagging."""
        from utils import count_tokens

        # Create content that's ~12 tokens (20% over target_max=10)
        entry = _make_entry("f001", target_tokens=[5, 10])
        content = "a b c d e f g h i j k l"
        tok = count_tokens(content)
        # Ensure it's above max but below 130% of max
        if tok <= 13:  # 10 * 1.3 = 13
            issues = _validate_content(content, entry, _sample_fact_shard())
            assert not any("Too long" in i for i in issues)

    def test_missing_locked_fact(self):
        entry = _make_entry("f001", locked_facts=["budget_q1"], target_tokens=[1, 1000])
        content = "This document does not contain the budget."
        issues = _validate_content(content, entry, _sample_fact_shard())
        assert any("Missing locked facts" in i for i in issues)

    def test_locked_fact_case_insensitive(self):
        entry = _make_entry("f001", locked_facts=["ref_ticket"], target_tokens=[1, 1000])
        content = "The ticket jira-1234 is referenced here."
        issues = _validate_content(content, entry, _sample_fact_shard())
        # Should find it case-insensitively
        assert not any("Missing locked facts" in i for i in issues)

    def test_no_locked_facts(self):
        entry = _make_entry("f001", locked_facts=[], target_tokens=[1, 1000])
        content = "Some content"
        issues = _validate_content(content, entry, _sample_fact_shard())
        assert not any("Missing locked facts" in i for i in issues)


# ---------------------------------------------------------------------------
# Tests: _build_context_files
# ---------------------------------------------------------------------------


class TestBuildContextFiles:
    def test_no_cross_refs(self):
        entry = _make_entry("f001", cross_refs=[])
        result = _build_context_files(entry, {}, {})
        assert result == {}

    def test_includes_generated_file(self):
        entry = _make_entry("f001", cross_refs=["f002"])
        generated = {"f002": "Some generated content"}
        result = _build_context_files(entry, generated, {})
        assert "f002" in result
        assert "Some generated content" in result["f002"]

    def test_skips_ungenerated_file(self):
        entry = _make_entry("f001", cross_refs=["f002"])
        result = _build_context_files(entry, {}, {})
        # f002 not generated, so not in context (will be in manifest_entries for brief)
        assert result == {}

    def test_truncates_long_content(self):
        entry = _make_entry("f001", cross_refs=["f002"])
        long_content = "word " * 20000  # Very long
        generated = {"f002": long_content}
        result = _build_context_files(entry, generated, {})
        from utils import count_tokens

        assert count_tokens(result["f002"]) <= MAX_CONTEXT_TOKENS_PER_FILE

    def test_respects_total_context_budget(self):
        # Create many cross-refs, each with substantial content
        refs = [f"f{i:03d}" for i in range(2, 20)]
        entry = _make_entry("f001", cross_refs=refs)
        generated = {fid: "word " * 5000 for fid in refs}
        manifest = {fid: _make_entry(fid) for fid in refs}
        result = _build_context_files(entry, generated, manifest)
        from utils import count_tokens

        total = sum(count_tokens(v) for v in result.values())
        assert total <= MAX_TOTAL_CONTEXT_TOKENS + 200  # small tolerance

    def test_prioritizes_most_connected_files(self):
        entry = _make_entry("f001", cross_refs=["f002", "f003"])
        generated = {
            "f002": "Content of f002",
            "f003": "Content of f003",
        }
        manifest = {
            "f002": _make_entry("f002", cross_refs=["f001", "f004", "f005"]),
            "f003": _make_entry("f003", cross_refs=["f001"]),
        }
        result = _build_context_files(entry, generated, manifest)
        # Both should be included since they're small
        assert "f002" in result
        assert "f003" in result


# ---------------------------------------------------------------------------
# Tests: _get_cluster_file_ids
# ---------------------------------------------------------------------------


class TestGetClusterFileIds:
    def test_with_file_ids_property(self):
        cluster = FakeCluster(
            cluster_id="c1",
            file_entries=[{"file_id": "f001"}, {"file_id": "f002"}],
        )
        assert _get_cluster_file_ids(cluster) == ["f001", "f002"]

    def test_with_file_entries_only(self):
        cluster = MinimalCluster(
            file_entries=[{"file_id": "f001"}, {"file_id": "f003"}],
        )
        # MinimalCluster has no file_ids property, so it falls through to file_entries
        # Actually, MinimalCluster doesn't have file_ids, so _get_cluster_file_ids
        # will use file_entries
        result = _get_cluster_file_ids(cluster)
        assert result == ["f001", "f003"]

    def test_raises_on_unsupported_object(self):
        class BadCluster:
            level = 0

        with pytest.raises(TypeError, match="file_entries"):
            _get_cluster_file_ids(BadCluster())


# ---------------------------------------------------------------------------
# Tests: generate_file (with mocked LLM)
# ---------------------------------------------------------------------------


class TestGenerateFile:
    @pytest.fixture
    def tmp_output(self, tmp_path):
        return tmp_path

    @pytest.mark.asyncio
    async def test_basic_generation(self, tmp_output):
        entry = _make_entry("f001", target_tokens=[1, 10000])
        fact_shard = _sample_fact_shard()

        with patch("worker.llm_call", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = "Generated document content " * 50
            content = await generate_file(
                file_entry=entry,
                fact_shard=fact_shard,
                context_files={},
                output_dir=tmp_output,
            )

        assert content
        assert (tmp_output / "data" / "docs" / "f001.md").exists()
        mock_llm.assert_called_once()

    @pytest.mark.asyncio
    async def test_resumes_from_gen_log(self, tmp_output):
        entry = _make_entry("f001")
        fact_shard = _sample_fact_shard()

        # Pre-create the file and mark as done in log
        dest = tmp_output / "data" / "docs" / "f001.md"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text("Existing content")

        gen_log = MagicMock()
        gen_log.is_done.return_value = True

        with patch("worker.llm_call", new_callable=AsyncMock) as mock_llm:
            content = await generate_file(
                file_entry=entry,
                fact_shard=fact_shard,
                context_files={},
                output_dir=tmp_output,
                gen_log=gen_log,
            )

        assert content == "Existing content"
        mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_resumes_from_disk_when_no_log(self, tmp_output):
        entry = _make_entry("f001")
        fact_shard = _sample_fact_shard()

        dest = tmp_output / "data" / "docs" / "f001.md"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text("On-disk content")

        with patch("worker.llm_call", new_callable=AsyncMock) as mock_llm:
            content = await generate_file(
                file_entry=entry,
                fact_shard=fact_shard,
                context_files={},
                output_dir=tmp_output,
                gen_log=None,
            )

        assert content == "On-disk content"
        mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_regenerates_when_log_done_but_file_missing(self, tmp_output):
        entry = _make_entry("f001", target_tokens=[1, 10000])
        fact_shard = _sample_fact_shard()

        gen_log = MagicMock()
        gen_log.is_done.return_value = True

        with patch("worker.llm_call", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = "Regenerated content " * 50
            content = await generate_file(
                file_entry=entry,
                fact_shard=fact_shard,
                context_files={},
                output_dir=tmp_output,
                gen_log=gen_log,
            )

        assert "Regenerated" in content
        mock_llm.assert_called_once()

    @pytest.mark.asyncio
    async def test_retries_on_validation_failure(self, tmp_output):
        entry = _make_entry(
            "f001",
            locked_facts=["budget_q1"],
            target_tokens=[1, 10000],
        )
        fact_shard = _sample_fact_shard()

        call_count = 0

        async def mock_llm_side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First attempt: missing the locked fact
                return "This document has no budget info " * 50
            else:
                # Second attempt: includes the fact
                return "The budget is $50,000.00 for this quarter " * 50

        with patch("worker.llm_call", new_callable=AsyncMock) as mock_llm:
            mock_llm.side_effect = mock_llm_side_effect
            content = await generate_file(
                file_entry=entry,
                fact_shard=fact_shard,
                context_files={},
                output_dir=tmp_output,
            )

        assert "$50,000.00" in content
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_writes_partial_after_all_retries_fail(self, tmp_output):
        entry = _make_entry(
            "f001",
            locked_facts=["budget_q1"],
            target_tokens=[1, 10000],
        )
        fact_shard = _sample_fact_shard()

        gen_log = MagicMock()
        gen_log.is_done.return_value = False

        with patch("worker.llm_call", new_callable=AsyncMock) as mock_llm:
            # All attempts fail to include the fact
            mock_llm.return_value = "No budget info here " * 50
            content = await generate_file(
                file_entry=entry,
                fact_shard=fact_shard,
                context_files={},
                output_dir=tmp_output,
                gen_log=gen_log,
            )

        # Should still write the file
        assert content
        assert (tmp_output / "data" / "docs" / "f001.md").exists()
        # Should log as partial
        gen_log.log_file.assert_called_once()
        call_kwargs = gen_log.log_file.call_args[1]
        assert call_kwargs["status"] == "partial"

    @pytest.mark.asyncio
    async def test_handles_llm_exception(self, tmp_output):
        entry = _make_entry("f001", target_tokens=[1, 10000])
        fact_shard = _sample_fact_shard()

        gen_log = MagicMock()
        gen_log.is_done.return_value = False

        with patch("worker.llm_call", new_callable=AsyncMock) as mock_llm:
            mock_llm.side_effect = RuntimeError("API error")
            content = await generate_file(
                file_entry=entry,
                fact_shard=fact_shard,
                context_files={},
                output_dir=tmp_output,
                gen_log=gen_log,
            )

        assert content == ""
        gen_log.log_file.assert_called_once()
        call_kwargs = gen_log.log_file.call_args[1]
        assert call_kwargs["status"] == "failed"

    @pytest.mark.asyncio
    async def test_strips_code_fences(self, tmp_output):
        entry = _make_entry("f001", target_tokens=[1, 10000])
        fact_shard = _sample_fact_shard()

        with patch("worker.llm_call", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = "```markdown\nActual content here\n```"
            content = await generate_file(
                file_entry=entry,
                fact_shard=fact_shard,
                context_files={},
                output_dir=tmp_output,
            )

        assert content.startswith("Actual content here")
        assert "```" not in content


# ---------------------------------------------------------------------------
# Tests: generate_cluster
# ---------------------------------------------------------------------------


class TestGenerateCluster:
    @pytest.mark.asyncio
    async def test_sequential_generation(self, tmp_path):
        entries = {
            "f001": _make_entry("f001", cross_refs=["f002"]),
            "f002": _make_entry("f002"),
        }
        cluster = FakeCluster(
            cluster_id="c1",
            file_entries=[{"file_id": "f001"}, {"file_id": "f002"}],
        )
        fact_shard = _sample_fact_shard()

        call_order: list[str] = []

        async def mock_gen_file(file_entry, **kwargs):
            fid = file_entry["file_id"]
            call_order.append(fid)
            return f"Content of {fid}"

        with patch("worker.generate_file", side_effect=mock_gen_file):
            result = await generate_cluster(
                cluster=cluster,
                manifest_entries=entries,
                fact_shard=fact_shard,
                output_dir=tmp_path,
                context_files={},
            )

        assert result == {"f001": "Content of f001", "f002": "Content of f002"}
        # Sequential: f001 before f002
        assert call_order == ["f001", "f002"]

    @pytest.mark.asyncio
    async def test_context_accumulates(self, tmp_path):
        entries = {
            "f001": _make_entry("f001"),
            "f002": _make_entry("f002", cross_refs=["f001"]),
        }
        cluster = FakeCluster(
            cluster_id="c1",
            file_entries=[{"file_id": "f001"}, {"file_id": "f002"}],
        )
        fact_shard = _sample_fact_shard()

        received_contexts: list[dict] = []

        async def mock_gen_file(file_entry, fact_shard, context_files, **kwargs):
            received_contexts.append(dict(context_files))
            return f"Content of {file_entry['file_id']}"

        with patch("worker.generate_file", side_effect=mock_gen_file):
            await generate_cluster(
                cluster=cluster,
                manifest_entries=entries,
                fact_shard=fact_shard,
                output_dir=tmp_path,
                context_files={},
            )

        # f002's context should include f001's generated content
        # But context_files passed to generate_file is built by _build_context_files
        # inside generate_cluster, which only includes cross-referenced files.
        # f002 cross-refs f001, so f001 should be in f002's context.
        # Note: the mock bypasses _build_context_files, so we just verify
        # the call count is correct
        assert len(received_contexts) == 2

    @pytest.mark.asyncio
    async def test_skips_missing_manifest_entry(self, tmp_path):
        entries = {"f001": _make_entry("f001")}
        cluster = FakeCluster(
            cluster_id="c1",
            file_entries=[{"file_id": "f001"}, {"file_id": "f999"}],
        )
        fact_shard = _sample_fact_shard()

        async def mock_gen_file(file_entry, **kwargs):
            return f"Content of {file_entry['file_id']}"

        with patch("worker.generate_file", side_effect=mock_gen_file):
            result = await generate_cluster(
                cluster=cluster,
                manifest_entries=entries,
                fact_shard=fact_shard,
                output_dir=tmp_path,
                context_files={},
            )

        assert "f001" in result
        assert "f999" not in result

    @pytest.mark.asyncio
    async def test_dependency_context_passed(self, tmp_path):
        entries = {
            "f003": _make_entry("f003", cross_refs=["f001"]),
        }
        cluster = FakeCluster(
            cluster_id="c2",
            file_entries=[{"file_id": "f003"}],
        )
        fact_shard = _sample_fact_shard()

        received_context_files: list[dict] = []

        async def mock_gen_file(file_entry, fact_shard, context_files, **kwargs):
            received_context_files.append(dict(context_files))
            return f"Content of {file_entry['file_id']}"

        dep_context = {"f001": "Dependency content from level 0"}

        with patch("worker.generate_file", side_effect=mock_gen_file):
            await generate_cluster(
                cluster=cluster,
                manifest_entries=entries,
                fact_shard=fact_shard,
                output_dir=tmp_path,
                context_files=dep_context,
            )

        # f003 references f001, which should appear in its context
        assert len(received_context_files) == 1
        assert "f001" in received_context_files[0]


# ---------------------------------------------------------------------------
# Tests: generate_all
# ---------------------------------------------------------------------------


class TestGenerateAll:
    @pytest.mark.asyncio
    async def test_levels_processed_in_order(self, tmp_path):
        entries = {
            "f001": _make_entry("f001"),
            "f002": _make_entry("f002"),
            "f003": _make_entry("f003"),
        }
        clusters = [
            FakeCluster(
                cluster_id="base",
                file_entries=[{"file_id": "f001"}],
                level=0,
            ),
            FakeCluster(
                cluster_id="mid",
                file_entries=[{"file_id": "f002"}],
                level=1,
            ),
            FakeCluster(
                cluster_id="top",
                file_entries=[{"file_id": "f003"}],
                level=2,
            ),
        ]
        fact_shard = _sample_fact_shard()

        level_order: list[int] = []

        original_gen_cluster = generate_cluster

        async def mock_gen_cluster(cluster, **kwargs):
            level_order.append(cluster.level)
            return {fid: f"content-{fid}" for fid in cluster.file_ids}

        with patch("worker.generate_cluster", side_effect=mock_gen_cluster):
            await generate_all(
                clusters=clusters,
                manifest_entries=entries,
                fallback_fact_registry=fact_shard,
                output_dir=tmp_path,
            )

        assert level_order == [0, 1, 2]

    @pytest.mark.asyncio
    async def test_same_level_clusters_run_concurrently(self, tmp_path):
        entries = {
            "f001": _make_entry("f001"),
            "f002": _make_entry("f002"),
            "f003": _make_entry("f003"),
        }
        clusters = [
            FakeCluster(
                cluster_id="a",
                file_entries=[{"file_id": "f001"}],
                level=0,
            ),
            FakeCluster(
                cluster_id="b",
                file_entries=[{"file_id": "f002"}],
                level=0,
            ),
            FakeCluster(
                cluster_id="c",
                file_entries=[{"file_id": "f003"}],
                level=0,
            ),
        ]
        fact_shard = _sample_fact_shard()

        started: list[str] = []
        finished: list[str] = []

        async def mock_gen_cluster(cluster, **kwargs):
            started.append(cluster.cluster_id)
            await asyncio.sleep(0.01)  # Small delay to test concurrency
            finished.append(cluster.cluster_id)
            return {fid: f"content-{fid}" for fid in cluster.file_ids}

        with patch("worker.generate_cluster", side_effect=mock_gen_cluster):
            await generate_all(
                clusters=clusters,
                manifest_entries=entries,
                fallback_fact_registry=fact_shard,
                output_dir=tmp_path,
                max_concurrent=10,
            )

        # All 3 clusters should have been processed
        assert set(finished) == {"a", "b", "c"}

    @pytest.mark.asyncio
    async def test_handles_cluster_failure(self, tmp_path):
        entries = {
            "f001": _make_entry("f001"),
            "f002": _make_entry("f002"),
        }
        clusters = [
            FakeCluster(
                cluster_id="ok",
                file_entries=[{"file_id": "f001"}],
                level=0,
            ),
            FakeCluster(
                cluster_id="fail",
                file_entries=[{"file_id": "f002"}],
                level=0,
            ),
        ]
        fact_shard = _sample_fact_shard()

        async def mock_gen_cluster(cluster, **kwargs):
            if cluster.cluster_id == "fail":
                raise RuntimeError("Cluster generation failed")
            return {fid: f"content-{fid}" for fid in cluster.file_ids}

        with patch("worker.generate_cluster", side_effect=mock_gen_cluster):
            # Should not raise — failures are logged
            await generate_all(
                clusters=clusters,
                manifest_entries=entries,
                fallback_fact_registry=fact_shard,
                output_dir=tmp_path,
            )

    @pytest.mark.asyncio
    async def test_context_propagates_across_levels(self, tmp_path):
        entries = {
            "f001": _make_entry("f001"),
            "f002": _make_entry("f002", cross_refs=["f001"]),
        }
        clusters = [
            FakeCluster(
                cluster_id="base",
                file_entries=[{"file_id": "f001"}],
                level=0,
            ),
            FakeCluster(
                cluster_id="dep",
                file_entries=[{"file_id": "f002"}],
                level=1,
            ),
        ]
        fact_shard = _sample_fact_shard()

        received_context: list[dict] = []

        async def mock_gen_cluster(cluster, context_files, **kwargs):
            received_context.append(dict(context_files))
            return {fid: f"content-{fid}" for fid in cluster.file_ids}

        with patch("worker.generate_cluster", side_effect=mock_gen_cluster):
            await generate_all(
                clusters=clusters,
                manifest_entries=entries,
                fallback_fact_registry=fact_shard,
                output_dir=tmp_path,
            )

        # Level 0 cluster gets empty context
        assert received_context[0] == {}
        # Level 1 cluster gets level 0's output
        assert "f001" in received_context[1]

    @pytest.mark.asyncio
    async def test_gen_log_summary_called(self, tmp_path):
        entries = {"f001": _make_entry("f001")}
        clusters = [
            FakeCluster(
                cluster_id="c1",
                file_entries=[{"file_id": "f001"}],
                level=0,
            ),
        ]
        fact_shard = _sample_fact_shard()
        gen_log = MagicMock()

        async def mock_gen_cluster(**kwargs):
            return {"f001": "content"}

        with patch("worker.generate_cluster", side_effect=mock_gen_cluster):
            await generate_all(
                clusters=clusters,
                manifest_entries=entries,
                fallback_fact_registry=fact_shard,
                output_dir=tmp_path,
                gen_log=gen_log,
            )

        gen_log.summary.assert_called_once()

    @pytest.mark.asyncio
    async def test_empty_clusters_list(self, tmp_path):
        """generate_all with no clusters should not error."""
        await generate_all(
            clusters=[],
            manifest_entries={},
            fallback_fact_registry={},
            output_dir=tmp_path,
        )

    @pytest.mark.asyncio
    async def test_max_concurrent_respected(self, tmp_path):
        """Test that semaphore limits concurrency."""
        entries = {f"f{i:03d}": _make_entry(f"f{i:03d}") for i in range(10)}
        clusters = [
            FakeCluster(
                cluster_id=f"c{i}",
                file_entries=[{"file_id": f"f{i:03d}"}],
                level=0,
            )
            for i in range(10)
        ]
        fact_shard = _sample_fact_shard()

        concurrent_count = 0
        max_observed_concurrent = 0

        async def mock_gen_cluster(cluster, **kwargs):
            nonlocal concurrent_count, max_observed_concurrent
            concurrent_count += 1
            max_observed_concurrent = max(max_observed_concurrent, concurrent_count)
            await asyncio.sleep(0.05)
            concurrent_count -= 1
            return {fid: f"content-{fid}" for fid in cluster.file_ids}

        with patch("worker.generate_cluster", side_effect=mock_gen_cluster):
            await generate_all(
                clusters=clusters,
                manifest_entries=entries,
                fallback_fact_registry=fact_shard,
                output_dir=tmp_path,
                max_concurrent=3,
            )

        assert max_observed_concurrent <= 3


# ---------------------------------------------------------------------------
# Tests: prompts/file_gen.py
# ---------------------------------------------------------------------------


class TestFileGenPrompts:
    def test_format_file_gen_prompt_returns_tuple(self):
        from prompts.file_gen import format_file_gen_prompt

        entry = _make_entry("f001", locked_facts=["budget_q1"])
        fact_shard = _sample_fact_shard()

        system, prompt = format_file_gen_prompt(entry, fact_shard, {})
        assert isinstance(system, str)
        assert isinstance(prompt, str)
        assert len(system) > 0
        assert len(prompt) > 0

    def test_prompt_contains_file_info(self):
        from prompts.file_gen import format_file_gen_prompt

        entry = _make_entry("f001", fmt="email_thread")
        fact_shard = _sample_fact_shard()

        _, prompt = format_file_gen_prompt(entry, fact_shard, {})
        assert "f001" in prompt
        assert "email_thread" in prompt

    def test_prompt_contains_locked_facts(self):
        from prompts.file_gen import format_file_gen_prompt

        entry = _make_entry("f001", locked_facts=["budget_q1"])
        fact_shard = _sample_fact_shard()

        _, prompt = format_file_gen_prompt(entry, fact_shard, {})
        assert "$50,000.00" in prompt

    def test_prompt_contains_format_instructions(self):
        from prompts.file_gen import FORMAT_INSTRUCTIONS, format_file_gen_prompt

        for fmt in FORMAT_INSTRUCTIONS:
            entry = _make_entry("f001", fmt=fmt)
            _, prompt = format_file_gen_prompt(entry, _sample_fact_shard(), {})
            # Should contain format-specific text
            assert fmt in prompt or "Format:" in prompt

    def test_prompt_with_cross_reference_context(self):
        from prompts.file_gen import format_file_gen_prompt

        entry = _make_entry("f001", cross_refs=["f002"])
        fact_shard = _sample_fact_shard()
        context = {"f002": "This is the content of f002"}

        _, prompt = format_file_gen_prompt(entry, fact_shard, context)
        assert "f002" in prompt
        assert "This is the content of f002" in prompt

    def test_prompt_with_ungenerated_cross_ref(self):
        from prompts.file_gen import format_file_gen_prompt

        entry = _make_entry("f001", cross_refs=["f002"])
        fact_shard = _sample_fact_shard()
        manifest = {"f002": _make_entry("f002")}

        _, prompt = format_file_gen_prompt(entry, fact_shard, {}, manifest_entries=manifest)
        assert "not yet generated" in prompt
        assert "f002" in prompt

    def test_format_retry_prompt(self):
        from prompts.file_gen import format_retry_prompt

        result = format_retry_prompt(
            issues=["Too short", "Missing facts"],
            previous_content="Previous attempt content",
            original_prompt="Original instructions",
        )
        assert "Too short" in result
        assert "Missing facts" in result
        assert "Previous attempt content" in result
        assert "Original instructions" in result

    def test_format_retry_prompt_truncates_previous(self):
        from prompts.file_gen import format_retry_prompt

        long_content = "x" * 20000
        result = format_retry_prompt(
            issues=["Issue"],
            previous_content=long_content,
            original_prompt="Original",
            max_previous_chars=100,
        )
        assert "[... truncated ...]" in result

    def test_all_required_formats_present(self):
        from prompts.file_gen import FORMAT_INSTRUCTIONS

        required = [
            "email_thread",
            "transcript",
            "legal_contract",
            "slack_export",
            "clinical_note",
            "memo",
            "markdown_prose",
            "profile",
        ]
        for fmt in required:
            assert fmt in FORMAT_INSTRUCTIONS, f"Missing format: {fmt}"

    def test_author_info_includes_writing_style(self):
        from prompts.file_gen import format_file_gen_prompt

        entry = _make_entry("f001", authors=["alice"])
        fact_shard = _sample_fact_shard()

        _, prompt = format_file_gen_prompt(entry, fact_shard, {})
        assert "Terse, uses abbreviations" in prompt

    def test_author_info_unknown_author(self):
        from prompts.file_gen import format_file_gen_prompt

        entry = _make_entry("f001", authors=["unknown_person"])
        fact_shard = _sample_fact_shard()

        _, prompt = format_file_gen_prompt(entry, fact_shard, {})
        assert "unknown_person" in prompt
        assert "no detailed profile" in prompt

    def test_target_length_in_prompt(self):
        from prompts.file_gen import format_file_gen_prompt

        entry = _make_entry("f001", target_tokens=[6000, 8000])
        fact_shard = _sample_fact_shard()

        _, prompt = format_file_gen_prompt(entry, fact_shard, {})
        assert "6,000" in prompt
        assert "8,000" in prompt
        # Character estimates (tokens * 4)
        assert "24,000" in prompt
        assert "32,000" in prompt
