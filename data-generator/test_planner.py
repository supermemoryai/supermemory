"""Tests for planner.py — the planning module for the eval corpus data generator."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import the module under test
import planner


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_SCENARIO_BLOCK = """\
dp_001: A small tech startup "Acme Labs" with 5 employees planning a product launch.
The CEO (Alice Smith), CTO (Bob Jones), and designer (Carol Lee) exchange emails,
Slack messages, and meeting notes over 3 weeks. Key decisions include pricing ($49/mo),
launch date (2025-03-15), and venue (Hilton Downtown, Room 301).
"""

SAMPLE_BRIEF = """\
# SCENARIO.md — dp_001

## 1. Overview
Scenario ID: dp_001
File count: 10
Time span: 2025-02-20 to 2025-03-15
Setting: Acme Labs, San Francisco

## 2. Cast of Characters
- alice_smith: Alice Smith, CEO, alice@acmelabs.com
- bob_jones: Bob Jones, CTO, bob@acmelabs.com
- carol_lee: Carol Lee, Designer, carol@acmelabs.com

## 3. Organizations
- Acme Labs: Tech startup, San Francisco

## 4. Timeline
- 2025-02-20: Kickoff meeting
- 2025-03-01: Pricing decision ($49/mo)
- 2025-03-15: Launch event at Hilton Downtown

## 5. Locked Facts Registry
- price_monthly: $49.00/mo
- launch_date: 2025-03-15
- venue: Hilton Downtown, Room 301
"""

SAMPLE_FACT_REGISTRY = {
    "scenario_id": "dp_001",
    "people": [
        {
            "id": "alice_smith",
            "full_name": "Alice Smith",
            "role": "CEO, Acme Labs",
            "email": "alice@acmelabs.com",
            "timezone": "America/Los_Angeles",
            "location": "San Francisco, CA",
            "traits": ["decisive", "formal writer"],
            "writing_style": "Concise, professional emails",
            "relationships": {"bob_jones": "direct report"},
        },
        {
            "id": "bob_jones",
            "full_name": "Bob Jones",
            "role": "CTO, Acme Labs",
            "email": "bob@acmelabs.com",
            "timezone": "America/Los_Angeles",
            "location": "San Francisco, CA",
            "traits": ["technical", "uses jargon"],
            "writing_style": "Detailed technical prose",
            "relationships": {"alice_smith": "reports to"},
        },
    ],
    "organizations": [
        {
            "id": "acme_labs",
            "name": "Acme Labs",
            "type": "company",
            "location": "San Francisco, CA",
            "details": {"industry": "tech"},
        }
    ],
    "dates": [
        {
            "id": "kickoff_meeting",
            "date": "2025-02-20",
            "event": "Kickoff meeting",
            "participants": ["alice_smith", "bob_jones"],
            "files": ["f001", "f002"],
        }
    ],
    "financial": [
        {
            "id": "price_monthly",
            "value": "$49.00",
            "description": "Monthly subscription price",
            "files": ["f003", "f005"],
        }
    ],
    "references": [],
    "locations": [
        {
            "id": "hilton_downtown",
            "name": "Hilton Downtown",
            "address": "123 Market St, San Francisco, CA",
            "type": "hotel",
            "details": {"room": "301"},
            "files": ["f004"],
        }
    ],
    "domain_facts": [],
    "cross_references": [
        {
            "source_file": "f001",
            "target_file": "f002",
            "fact_ids": ["kickoff_meeting"],
            "description": "Meeting notes reference email thread",
        }
    ],
}

SAMPLE_MANIFEST_ENTRY = {
    "file_id": "f001",
    "path": "data/emails/kickoff_thread.eml",
    "format": "email_thread",
    "authors": ["alice_smith", "bob_jones"],
    "date": "2025-02-20",
    "target_tokens": [6000, 8000],
    "locked_facts": ["kickoff_meeting", "price_monthly"],
    "cross_references": ["f002", "f003"],
    "cluster_hint": "communications",
    "brief": "Email thread between Alice and Bob discussing the kickoff meeting. Contains pricing decisions.",
    "tone": "formal",
    "format_notes": "Standard email headers, threaded replies",
}


def _make_manifest(count: int) -> list[dict]:
    """Create a list of sample manifest entries."""
    entries = []
    for i in range(count):
        entry = dict(SAMPLE_MANIFEST_ENTRY)
        entry["file_id"] = f"f{i + 1:03d}"
        entry["path"] = f"data/files/file_{i + 1:03d}.md"
        entry["cross_references"] = []
        entries.append(entry)
    return entries


# ---------------------------------------------------------------------------
# Validation helpers tests
# ---------------------------------------------------------------------------


class TestValidateFactRegistry:
    def test_valid_registry(self):
        result = planner._validate_fact_registry(SAMPLE_FACT_REGISTRY)
        assert result is SAMPLE_FACT_REGISTRY

    def test_missing_people_key(self):
        bad = {"organizations": [], "dates": []}
        with pytest.raises(ValueError, match="missing required keys"):
            planner._validate_fact_registry(bad)

    def test_missing_organizations_key(self):
        bad = {"people": [], "dates": []}
        with pytest.raises(ValueError, match="missing required keys"):
            planner._validate_fact_registry(bad)

    def test_missing_dates_key(self):
        bad = {"people": [], "organizations": []}
        with pytest.raises(ValueError, match="missing required keys"):
            planner._validate_fact_registry(bad)

    def test_person_missing_id(self):
        bad = {
            "people": [{"full_name": "No ID"}],
            "organizations": [],
            "dates": [],
        }
        with pytest.raises(ValueError, match="missing 'id'"):
            planner._validate_fact_registry(bad)


class TestValidateManifestEntry:
    def test_valid_entry(self):
        warnings = planner._validate_manifest_entry(SAMPLE_MANIFEST_ENTRY, 0)
        assert warnings == []

    def test_missing_fields(self):
        warnings = planner._validate_manifest_entry({"file_id": "f001"}, 0)
        assert any("missing fields" in w for w in warnings)

    def test_tokens_out_of_range(self):
        entry = dict(SAMPLE_MANIFEST_ENTRY)
        entry["target_tokens"] = [1000, 20000]
        warnings = planner._validate_manifest_entry(entry, 0)
        assert any("outside [5000, 10000]" in w for w in warnings)

    def test_tokens_min_gt_max(self):
        entry = dict(SAMPLE_MANIFEST_ENTRY)
        entry["target_tokens"] = [9000, 6000]
        warnings = planner._validate_manifest_entry(entry, 0)
        assert any("min > max" in w for w in warnings)

    def test_tokens_valid_boundary(self):
        entry = dict(SAMPLE_MANIFEST_ENTRY)
        entry["target_tokens"] = [5000, 10000]
        warnings = planner._validate_manifest_entry(entry, 0)
        assert warnings == []

    def test_tokens_malformed(self):
        entry = dict(SAMPLE_MANIFEST_ENTRY)
        entry["target_tokens"] = "not a list"
        warnings = planner._validate_manifest_entry(entry, 0)
        assert any("malformed" in w for w in warnings)


class TestRenumberManifest:
    def test_sequential_renumbering(self):
        entries = [
            {"file_id": "f010", "cross_references": ["f020"]},
            {"file_id": "f020", "cross_references": ["f010"]},
            {"file_id": "f030", "cross_references": []},
        ]
        result = planner._renumber_manifest(entries)
        assert result[0]["file_id"] == "f001"
        assert result[1]["file_id"] == "f002"
        assert result[2]["file_id"] == "f003"

    def test_cross_references_updated(self):
        entries = [
            {"file_id": "f010", "cross_references": ["f020", "f030"]},
            {"file_id": "f020", "cross_references": ["f010"]},
            {"file_id": "f030", "cross_references": ["f010"]},
        ]
        result = planner._renumber_manifest(entries)
        assert result[0]["cross_references"] == ["f002", "f003"]
        assert result[1]["cross_references"] == ["f001"]
        assert result[2]["cross_references"] == ["f001"]

    def test_unknown_references_preserved(self):
        entries = [
            {"file_id": "f001", "cross_references": ["f999"]},
        ]
        result = planner._renumber_manifest(entries)
        # f999 is not in the manifest, so it stays as-is
        assert result[0]["cross_references"] == ["f999"]

    def test_empty_manifest(self):
        result = planner._renumber_manifest([])
        assert result == []


class TestValidateManifest:
    def test_valid_manifest(self):
        manifest = _make_manifest(3)
        result = planner._validate_manifest(manifest)
        assert len(result) == 3

    def test_warnings_logged(self, caplog):
        bad_entry = {"file_id": "f001"}  # missing most fields
        with caplog.at_level("WARNING"):
            planner._validate_manifest([bad_entry])
        assert "missing fields" in caplog.text


# ---------------------------------------------------------------------------
# Phase 1 tests
# ---------------------------------------------------------------------------


class TestGenerateScenarioBrief:
    @pytest.mark.asyncio
    async def test_generates_and_writes_file(self, tmp_path):
        with patch("planner.llm_call", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = SAMPLE_BRIEF

            result = await planner.generate_scenario_brief(
                SAMPLE_SCENARIO_BLOCK, 10, tmp_path
            )

        assert result == SAMPLE_BRIEF
        assert (tmp_path / "SCENARIO.md").exists()
        assert (tmp_path / "SCENARIO.md").read_text() == SAMPLE_BRIEF
        mock_llm.assert_called_once()

    @pytest.mark.asyncio
    async def test_resume_skips_existing(self, tmp_path):
        # Pre-create SCENARIO.md
        (tmp_path / "SCENARIO.md").write_text("existing brief")

        with patch("planner.llm_call", new_callable=AsyncMock) as mock_llm:
            result = await planner.generate_scenario_brief(
                SAMPLE_SCENARIO_BLOCK, 10, tmp_path
            )

        assert result == "existing brief"
        mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_passes_correct_model(self, tmp_path):
        with patch("planner.llm_call", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = "brief"
            await planner.generate_scenario_brief(
                SAMPLE_SCENARIO_BLOCK, 10, tmp_path, model="custom/model"
            )

        call_kwargs = mock_llm.call_args
        assert call_kwargs.kwargs["model"] == "custom/model"

    @pytest.mark.asyncio
    async def test_uses_scenario_brief_system_prompt(self, tmp_path):
        with patch("planner.llm_call", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = "brief"
            await planner.generate_scenario_brief(
                SAMPLE_SCENARIO_BLOCK, 10, tmp_path
            )

        call_kwargs = mock_llm.call_args
        assert call_kwargs.kwargs["system"] == planner.SCENARIO_BRIEF_SYSTEM


# ---------------------------------------------------------------------------
# Phase 2 tests
# ---------------------------------------------------------------------------


class TestExtractFactRegistry:
    @pytest.mark.asyncio
    async def test_extracts_and_writes_file(self, tmp_path):
        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = SAMPLE_FACT_REGISTRY

            result = await planner.extract_fact_registry(SAMPLE_BRIEF, tmp_path)

        assert result == SAMPLE_FACT_REGISTRY
        assert (tmp_path / "facts.json").exists()
        saved = json.loads((tmp_path / "facts.json").read_text())
        assert saved["scenario_id"] == "dp_001"
        mock_llm.assert_called_once()

    @pytest.mark.asyncio
    async def test_resume_skips_existing(self, tmp_path):
        (tmp_path / "facts.json").write_text(json.dumps(SAMPLE_FACT_REGISTRY))

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            result = await planner.extract_fact_registry(SAMPLE_BRIEF, tmp_path)

        assert result["scenario_id"] == "dp_001"
        mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_unwraps_nested_response(self, tmp_path):
        """LLM might return {"result": {actual registry}}."""
        wrapped = {"result": SAMPLE_FACT_REGISTRY}

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = wrapped
            result = await planner.extract_fact_registry(SAMPLE_BRIEF, tmp_path)

        assert result["scenario_id"] == "dp_001"

    @pytest.mark.asyncio
    async def test_validation_fails_on_bad_registry(self, tmp_path):
        bad_registry = {"not_valid": True}

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = bad_registry
            with pytest.raises(ValueError, match="missing required keys"):
                await planner.extract_fact_registry(SAMPLE_BRIEF, tmp_path)

    @pytest.mark.asyncio
    async def test_uses_fact_registry_system_prompt(self, tmp_path):
        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = SAMPLE_FACT_REGISTRY
            await planner.extract_fact_registry(SAMPLE_BRIEF, tmp_path)

        call_kwargs = mock_llm.call_args
        assert call_kwargs.kwargs["system"] == planner.FACT_REGISTRY_SYSTEM


# ---------------------------------------------------------------------------
# Phase 3 tests
# ---------------------------------------------------------------------------


class TestGenerateManifest:
    @pytest.mark.asyncio
    async def test_small_manifest_single_call(self, tmp_path):
        manifest = _make_manifest(10)

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = manifest

            result = await planner.generate_manifest(
                SAMPLE_BRIEF, SAMPLE_FACT_REGISTRY, 10, tmp_path
            )

        assert len(result) == 10
        assert result[0]["file_id"] == "f001"
        assert (tmp_path / "manifest.json").exists()
        mock_llm.assert_called_once()

    @pytest.mark.asyncio
    async def test_small_manifest_unwraps_dict(self, tmp_path):
        """LLM might return {"files": [...]} instead of bare array."""
        manifest = _make_manifest(5)
        wrapped = {"files": manifest}

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = wrapped

            result = await planner.generate_manifest(
                SAMPLE_BRIEF, SAMPLE_FACT_REGISTRY, 5, tmp_path
            )

        assert len(result) == 5

    @pytest.mark.asyncio
    async def test_resume_skips_existing(self, tmp_path):
        manifest = _make_manifest(10)
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            result = await planner.generate_manifest(
                SAMPLE_BRIEF, SAMPLE_FACT_REGISTRY, 10, tmp_path
            )

        assert len(result) == 10
        mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_resume_unwraps_files_key(self, tmp_path):
        manifest = _make_manifest(5)
        (tmp_path / "manifest.json").write_text(json.dumps({"files": manifest}))

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            result = await planner.generate_manifest(
                SAMPLE_BRIEF, SAMPLE_FACT_REGISTRY, 5, tmp_path
            )

        assert len(result) == 5
        mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_large_manifest_chunked(self, tmp_path):
        """Corpora > 50 files should use chunked generation."""
        outline = {
            "sections": [
                {
                    "name": "Section A",
                    "cluster_hint": "section_a",
                    "file_count": 30,
                    "description": "First section",
                },
                {
                    "name": "Section B",
                    "cluster_hint": "section_b",
                    "file_count": 30,
                    "description": "Second section",
                },
            ]
        }
        section_a_entries = _make_manifest(30)
        section_b_entries = _make_manifest(30)

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            # First call returns outline, next two return section entries
            mock_llm.side_effect = [outline, section_a_entries, section_b_entries]

            result = await planner.generate_manifest(
                SAMPLE_BRIEF, SAMPLE_FACT_REGISTRY, 60, tmp_path
            )

        assert len(result) == 60
        # Should have been called 3 times: outline + 2 sections
        assert mock_llm.call_count == 3
        # Verify sequential numbering
        assert result[0]["file_id"] == "f001"
        assert result[29]["file_id"] == "f030"
        assert result[30]["file_id"] == "f031"
        assert result[59]["file_id"] == "f060"

    @pytest.mark.asyncio
    async def test_large_manifest_adjusts_file_count(self, tmp_path):
        """If outline section counts don't add up, the last section is adjusted."""
        outline = {
            "sections": [
                {
                    "name": "Section A",
                    "cluster_hint": "section_a",
                    "file_count": 25,
                    "description": "First section",
                },
                {
                    "name": "Section B",
                    "cluster_hint": "section_b",
                    "file_count": 24,  # total=49, should be 55
                    "description": "Second section",
                },
            ]
        }
        section_a_entries = _make_manifest(25)
        section_b_entries = _make_manifest(30)  # adjusted to 30

        with patch("planner.llm_call_json", new_callable=AsyncMock) as mock_llm:
            mock_llm.side_effect = [outline, section_a_entries, section_b_entries]

            result = await planner.generate_manifest(
                SAMPLE_BRIEF, SAMPLE_FACT_REGISTRY, 55, tmp_path
            )

        # Outline call should have adjusted Section B to 30
        assert mock_llm.call_count == 3


# ---------------------------------------------------------------------------
# Orchestrator tests
# ---------------------------------------------------------------------------


class TestRunPlanning:
    @pytest.mark.asyncio
    async def test_runs_all_three_phases(self, tmp_path):
        manifest = _make_manifest(10)

        with patch("planner.llm_call", new_callable=AsyncMock) as mock_text, \
             patch("planner.llm_call_json", new_callable=AsyncMock) as mock_json:
            mock_text.return_value = SAMPLE_BRIEF
            mock_json.side_effect = [SAMPLE_FACT_REGISTRY, manifest]

            brief, facts, result_manifest = await planner.run_planning(
                SAMPLE_SCENARIO_BLOCK, 10, tmp_path
            )

        assert brief == SAMPLE_BRIEF
        assert facts == SAMPLE_FACT_REGISTRY
        assert len(result_manifest) == 10
        assert (tmp_path / "SCENARIO.md").exists()
        assert (tmp_path / "facts.json").exists()
        assert (tmp_path / "manifest.json").exists()

    @pytest.mark.asyncio
    async def test_creates_output_dir(self, tmp_path):
        out = tmp_path / "nested" / "output"
        manifest = _make_manifest(5)

        with patch("planner.llm_call", new_callable=AsyncMock) as mock_text, \
             patch("planner.llm_call_json", new_callable=AsyncMock) as mock_json:
            mock_text.return_value = SAMPLE_BRIEF
            mock_json.side_effect = [SAMPLE_FACT_REGISTRY, manifest]

            await planner.run_planning(SAMPLE_SCENARIO_BLOCK, 5, out)

        assert out.exists()
        assert (out / "SCENARIO.md").exists()

    @pytest.mark.asyncio
    async def test_resumes_from_phase2(self, tmp_path):
        """If SCENARIO.md exists, skip Phase 1 and continue."""
        (tmp_path / "SCENARIO.md").write_text(SAMPLE_BRIEF)
        manifest = _make_manifest(10)

        with patch("planner.llm_call", new_callable=AsyncMock) as mock_text, \
             patch("planner.llm_call_json", new_callable=AsyncMock) as mock_json:
            mock_json.side_effect = [SAMPLE_FACT_REGISTRY, manifest]

            brief, facts, result_manifest = await planner.run_planning(
                SAMPLE_SCENARIO_BLOCK, 10, tmp_path
            )

        # Phase 1 LLM call should NOT have been made
        mock_text.assert_not_called()
        assert brief == SAMPLE_BRIEF

    @pytest.mark.asyncio
    async def test_resumes_from_phase3(self, tmp_path):
        """If SCENARIO.md and facts.json exist, skip Phases 1 and 2."""
        (tmp_path / "SCENARIO.md").write_text(SAMPLE_BRIEF)
        (tmp_path / "facts.json").write_text(json.dumps(SAMPLE_FACT_REGISTRY))
        manifest = _make_manifest(10)

        with patch("planner.llm_call", new_callable=AsyncMock) as mock_text, \
             patch("planner.llm_call_json", new_callable=AsyncMock) as mock_json:
            mock_json.side_effect = [manifest]

            brief, facts, result_manifest = await planner.run_planning(
                SAMPLE_SCENARIO_BLOCK, 10, tmp_path
            )

        mock_text.assert_not_called()
        # Only one json call (manifest), not two
        assert mock_json.call_count == 1

    @pytest.mark.asyncio
    async def test_full_resume(self, tmp_path):
        """If all artifacts exist, no LLM calls made at all."""
        (tmp_path / "SCENARIO.md").write_text(SAMPLE_BRIEF)
        (tmp_path / "facts.json").write_text(json.dumps(SAMPLE_FACT_REGISTRY))
        manifest = _make_manifest(10)
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        with patch("planner.llm_call", new_callable=AsyncMock) as mock_text, \
             patch("planner.llm_call_json", new_callable=AsyncMock) as mock_json:
            brief, facts, result_manifest = await planner.run_planning(
                SAMPLE_SCENARIO_BLOCK, 10, tmp_path
            )

        mock_text.assert_not_called()
        mock_json.assert_not_called()
        assert brief == SAMPLE_BRIEF
        assert len(result_manifest) == 10


# ---------------------------------------------------------------------------
# Constants tests
# ---------------------------------------------------------------------------


class TestConstants:
    def test_large_corpus_threshold(self):
        assert planner.LARGE_CORPUS_THRESHOLD == 50

    def test_chunk_size(self):
        assert planner.CHUNK_SIZE == 30
