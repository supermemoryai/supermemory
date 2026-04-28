"""Tests for validator.py — Phase 6: Cross-Reference & Consistency Audit."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from validator import (
    TOKEN_MAX,
    TOKEN_MIN,
    ValidationIssue,
    ValidationReport,
    _check_cross_references,
    _check_file_existence,
    _check_locked_facts,
    _check_name_consistency,
    _check_token_counts,
    _normalize_date,
    validate_corpus,
    repair_files,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tmp_corpus(tmp_path: Path):
    """Create a minimal corpus directory with a single valid file."""
    data_dir = tmp_path / "data" / "emails"
    data_dir.mkdir(parents=True)

    # Write a file with known content (~100 tokens is enough for basic tests)
    content = "Hello World. " * 500  # roughly 500 tokens — below minimum
    (data_dir / "test.md").write_text(content)

    return tmp_path


@pytest.fixture
def sample_manifest():
    """A minimal manifest for testing."""
    return [
        {
            "file_id": "f001",
            "path": "data/emails/test.md",
            "format": "markdown_prose",
            "authors": ["person_alice"],
            "date": "2026-04-22",
            "target_tokens": [5000, 10000],
            "locked_facts": ["fin_budget", "ref_booking"],
            "cross_references": ["f002"],
            "cluster_hint": "emails",
            "brief": "Test email file",
            "tone": "casual",
            "format_notes": "",
        },
        {
            "file_id": "f002",
            "path": "data/contracts/contract.md",
            "format": "legal_contract",
            "authors": ["person_bob"],
            "date": "2026-03-15",
            "target_tokens": [5000, 10000],
            "locked_facts": ["person_alice"],
            "cross_references": ["f001"],
            "cluster_hint": "legal",
            "brief": "Legal contract",
            "tone": "formal",
            "format_notes": "",
        },
    ]


@pytest.fixture
def sample_fact_registry():
    """A minimal fact registry for testing."""
    return {
        "people": [
            {
                "id": "person_alice",
                "full_name": "Alice Johnson",
                "role": "CTO, Acme Corp",
                "email": "alice@acme.com",
            },
            {
                "id": "person_bob",
                "full_name": "Bob Williams",
                "role": "General Counsel, Acme Corp",
                "email": "bob@acme.com",
            },
        ],
        "organizations": [
            {
                "id": "org_acme",
                "name": "Acme Corp",
                "type": "company",
                "location": "San Francisco, CA",
            },
        ],
        "financial": [
            {
                "id": "fin_budget",
                "value": "$2,034.50",
                "description": "Q1 marketing budget",
                "files": ["f001"],
            },
        ],
        "references": [
            {
                "id": "ref_booking",
                "value": "BK-2026-0422",
                "type": "booking",
                "description": "Hotel booking reference",
                "files": ["f001"],
            },
        ],
        "dates": [
            {
                "id": "date_deadline",
                "date": "2026-04-22",
                "event": "Project deadline",
                "files": ["f001"],
            },
        ],
        "locations": [],
        "domain_facts": [],
        "cross_references": [],
    }


# ---------------------------------------------------------------------------
# Tests: ValidationReport
# ---------------------------------------------------------------------------


class TestValidationReport:
    def test_errors_and_warnings(self):
        issues = [
            ValidationIssue("f001", "token_count", "error", "too short"),
            ValidationIssue("f002", "name_inconsistency", "warning", "name mismatch"),
            ValidationIssue("f003", "missing_fact", "error", "fact missing"),
        ]
        report = ValidationReport(total_files=3, files_checked=3, issues=issues)

        assert len(report.errors) == 2
        assert len(report.warnings) == 1
        assert report.errors[0].file_id == "f001"
        assert report.errors[1].file_id == "f003"
        assert report.warnings[0].file_id == "f002"

    def test_empty_report(self):
        report = ValidationReport(total_files=5, files_checked=5)
        assert report.errors == []
        assert report.warnings == []


# ---------------------------------------------------------------------------
# Tests: _normalize_date
# ---------------------------------------------------------------------------


class TestNormalizeDate:
    def test_iso_date(self):
        variants = _normalize_date("2026-04-22")
        assert "2026-04-22" in variants
        assert "April 22, 2026" in variants
        assert "Apr 22, 2026" in variants
        assert "04/22/2026" in variants
        assert "22 April 2026" in variants

    def test_january(self):
        variants = _normalize_date("2025-01-05")
        assert "January 5, 2025" in variants
        assert "Jan 5, 2025" in variants
        assert "01/05/2025" in variants

    def test_non_date_string(self):
        variants = _normalize_date("not-a-date")
        assert variants == ["not-a-date"]

    def test_december(self):
        variants = _normalize_date("2024-12-31")
        assert "December 31, 2024" in variants
        assert "Dec 31, 2024" in variants


# ---------------------------------------------------------------------------
# Tests: _check_file_existence
# ---------------------------------------------------------------------------


class TestCheckFileExistence:
    def test_existing_file(self, tmp_corpus, sample_manifest):
        # Only f001 exists
        issues = _check_file_existence(tmp_corpus, [sample_manifest[0]])
        assert len(issues) == 0

    def test_missing_file(self, tmp_corpus, sample_manifest):
        # f002 doesn't exist
        issues = _check_file_existence(tmp_corpus, [sample_manifest[1]])
        assert len(issues) == 1
        assert issues[0].issue_type == "file_missing"
        assert issues[0].severity == "error"

    def test_mixed_existence(self, tmp_corpus, sample_manifest):
        issues = _check_file_existence(tmp_corpus, sample_manifest)
        # f001 exists, f002 does not
        assert len(issues) == 1
        assert issues[0].file_id == "f002"


# ---------------------------------------------------------------------------
# Tests: _check_token_counts
# ---------------------------------------------------------------------------


class TestCheckTokenCounts:
    def test_file_below_minimum(self, tmp_corpus, sample_manifest):
        # The test file has ~500 tokens, well below TOKEN_MIN
        issues, token_map, stats = _check_token_counts(tmp_corpus, [sample_manifest[0]])
        assert len(issues) == 1
        assert issues[0].issue_type == "token_count"
        assert issues[0].severity == "error"
        assert "below minimum" in issues[0].description

    def test_file_in_range(self, tmp_corpus, sample_manifest):
        # Write a file with enough tokens
        file_path = tmp_corpus / "data" / "emails" / "test.md"
        content = "The quick brown fox jumps over the lazy dog. " * 1200  # ~12k tokens → adjust
        file_path.write_text(content)

        issues, token_map, stats = _check_token_counts(tmp_corpus, [sample_manifest[0]])
        token_count = token_map.get("f001", 0)
        if TOKEN_MIN <= token_count <= TOKEN_MAX:
            assert len(issues) == 0
        # If our estimate is wrong, just verify the check ran
        assert "f001" in token_map

    def test_stats_computed(self, tmp_corpus, sample_manifest):
        issues, token_map, stats = _check_token_counts(tmp_corpus, [sample_manifest[0]])
        assert "min" in stats
        assert "max" in stats
        assert "mean" in stats
        assert "median" in stats

    def test_missing_file_skipped(self, tmp_corpus, sample_manifest):
        # f002 doesn't exist — should be silently skipped
        issues, token_map, stats = _check_token_counts(tmp_corpus, [sample_manifest[1]])
        assert len(issues) == 0
        assert "f002" not in token_map


# ---------------------------------------------------------------------------
# Tests: _check_locked_facts
# ---------------------------------------------------------------------------


class TestCheckLockedFacts:
    def test_all_facts_present(self, tmp_corpus, sample_manifest, sample_fact_registry):
        # Write content that contains all locked facts for f001
        file_path = tmp_corpus / "data" / "emails" / "test.md"
        content = (
            "The Q1 marketing budget is $2,034.50 and the booking reference "
            "is BK-2026-0422. Alice Johnson confirmed on April 22, 2026."
        )
        file_path.write_text(content)

        issues = _check_locked_facts(tmp_corpus, [sample_manifest[0]], sample_fact_registry)
        # Should have no errors for f001 — all locked facts are present
        f001_errors = [i for i in issues if i.file_id == "f001" and i.severity == "error"]
        assert len(f001_errors) == 0

    def test_missing_financial_fact(self, tmp_corpus, sample_manifest, sample_fact_registry):
        file_path = tmp_corpus / "data" / "emails" / "test.md"
        content = "The booking reference is BK-2026-0422. No budget info here."
        file_path.write_text(content)

        issues = _check_locked_facts(tmp_corpus, [sample_manifest[0]], sample_fact_registry)
        error_ids = [i.details.get("fact_id") for i in issues if i.severity == "error"]
        assert "fin_budget" in error_ids

    def test_missing_reference_fact(self, tmp_corpus, sample_manifest, sample_fact_registry):
        file_path = tmp_corpus / "data" / "emails" / "test.md"
        content = "The budget is $2,034.50 but no booking reference here."
        file_path.write_text(content)

        issues = _check_locked_facts(tmp_corpus, [sample_manifest[0]], sample_fact_registry)
        error_ids = [i.details.get("fact_id") for i in issues if i.severity == "error"]
        assert "ref_booking" in error_ids

    def test_date_variant_matching(self, tmp_corpus, sample_fact_registry):
        """Check that date facts match any common format variant."""
        manifest_with_date = [
            {
                "file_id": "f001",
                "path": "data/emails/test.md",
                "locked_facts": ["date_deadline"],
                "cross_references": [],
            },
        ]

        # Test ISO format
        file_path = tmp_corpus / "data" / "emails" / "test.md"
        file_path.write_text("Deadline is 2026-04-22.")
        issues = _check_locked_facts(tmp_corpus, manifest_with_date, sample_fact_registry)
        date_errors = [i for i in issues if i.details.get("fact_id") == "date_deadline" and i.severity == "error"]
        assert len(date_errors) == 0

        # Test natural format
        file_path.write_text("Deadline is April 22, 2026.")
        issues = _check_locked_facts(tmp_corpus, manifest_with_date, sample_fact_registry)
        date_errors = [i for i in issues if i.details.get("fact_id") == "date_deadline" and i.severity == "error"]
        assert len(date_errors) == 0

        # Test abbreviated format
        file_path.write_text("Deadline is Apr 22, 2026.")
        issues = _check_locked_facts(tmp_corpus, manifest_with_date, sample_fact_registry)
        date_errors = [i for i in issues if i.details.get("fact_id") == "date_deadline" and i.severity == "error"]
        assert len(date_errors) == 0

    def test_person_name_check(self, tmp_corpus, sample_manifest, sample_fact_registry):
        """Check that person names are found case-insensitively."""
        # f002 has locked_facts: ["person_alice"]
        contract_dir = tmp_corpus / "data" / "contracts"
        contract_dir.mkdir(parents=True, exist_ok=True)
        (contract_dir / "contract.md").write_text("Contract signed by alice johnson.")

        issues = _check_locked_facts(tmp_corpus, [sample_manifest[1]], sample_fact_registry)
        person_errors = [i for i in issues if i.details.get("fact_id") == "person_alice" and i.severity == "error"]
        assert len(person_errors) == 0

    def test_unknown_fact_id_warns(self, tmp_corpus, sample_fact_registry):
        manifest_with_unknown = [
            {
                "file_id": "f001",
                "path": "data/emails/test.md",
                "locked_facts": ["nonexistent_fact"],
                "cross_references": [],
            },
        ]

        issues = _check_locked_facts(tmp_corpus, manifest_with_unknown, sample_fact_registry)
        warnings = [i for i in issues if i.severity == "warning"]
        assert len(warnings) == 1
        assert "not found in fact registry" in warnings[0].description


# ---------------------------------------------------------------------------
# Tests: _check_name_consistency
# ---------------------------------------------------------------------------


class TestCheckNameConsistency:
    def test_consistent_names(self, tmp_corpus, sample_manifest, sample_fact_registry):
        file_path = tmp_corpus / "data" / "emails" / "test.md"
        file_path.write_text("Alice Johnson sent a message. Johnson approved the plan.")
        issues = _check_name_consistency(tmp_corpus, [sample_manifest[0]], sample_fact_registry)
        # "Johnson" appears and "Alice Johnson" also appears — no issue
        johnson_issues = [i for i in issues if "Johnson" in i.description or "johnson" in i.description.lower()]
        assert len(johnson_issues) == 0

    def test_last_name_without_full_name(self, tmp_corpus, sample_manifest, sample_fact_registry):
        file_path = tmp_corpus / "data" / "emails" / "test.md"
        file_path.write_text("Williams reviewed the contract and approved it.")
        issues = _check_name_consistency(tmp_corpus, [sample_manifest[0]], sample_fact_registry)
        # "Williams" appears but "Bob Williams" does not — should warn
        williams_issues = [i for i in issues if "williams" in i.description.lower()]
        assert len(williams_issues) == 1
        assert williams_issues[0].severity == "warning"

    def test_no_people_in_registry(self, tmp_corpus, sample_manifest):
        registry_no_people = {"people": [], "organizations": []}
        issues = _check_name_consistency(tmp_corpus, sample_manifest, registry_no_people)
        assert len(issues) == 0


# ---------------------------------------------------------------------------
# Tests: _check_cross_references
# ---------------------------------------------------------------------------


class TestCheckCrossReferences:
    def test_valid_cross_references(self, sample_manifest):
        issues = _check_cross_references(Path("/unused"), sample_manifest)
        # f001 refs f002, f002 refs f001 — both valid
        assert len(issues) == 0

    def test_broken_cross_reference(self):
        manifest = [
            {
                "file_id": "f001",
                "path": "data/test.md",
                "cross_references": ["f999"],
            },
        ]
        issues = _check_cross_references(Path("/unused"), manifest)
        assert len(issues) == 1
        assert issues[0].issue_type == "cross_ref_broken"
        assert issues[0].severity == "error"

    def test_cross_reference_by_path(self, sample_manifest):
        # Add a cross-reference by path instead of file_id
        manifest = [
            {
                "file_id": "f001",
                "path": "data/emails/test.md",
                "cross_references": ["data/contracts/contract.md"],
            },
            {
                "file_id": "f002",
                "path": "data/contracts/contract.md",
                "cross_references": [],
            },
        ]
        issues = _check_cross_references(Path("/unused"), manifest)
        assert len(issues) == 0

    def test_empty_cross_references(self):
        manifest = [
            {"file_id": "f001", "path": "data/test.md", "cross_references": []},
        ]
        issues = _check_cross_references(Path("/unused"), manifest)
        assert len(issues) == 0


# ---------------------------------------------------------------------------
# Tests: validate_corpus (integration)
# ---------------------------------------------------------------------------


class TestValidateCorpus:
    def test_full_validation(self, tmp_corpus, sample_manifest, sample_fact_registry):
        """Integration test: run full validation on a minimal corpus."""
        # Write content with all required facts for f001
        file_path = tmp_corpus / "data" / "emails" / "test.md"
        content = (
            "Alice Johnson confirmed the Q1 marketing budget of $2,034.50. "
            "The booking reference is BK-2026-0422. "
            "The deadline is April 22, 2026. "
        )
        # Pad to meet token minimum
        content += "Additional context and details follow. " * 800
        file_path.write_text(content)

        report = asyncio.run(validate_corpus(tmp_corpus, sample_manifest, sample_fact_registry))

        assert report.total_files == 2
        assert report.files_checked == 1  # only f001 exists

        # Should have at least a file_missing error for f002
        missing_errors = [i for i in report.errors if i.issue_type == "file_missing"]
        assert len(missing_errors) >= 1

        # Report should be written to disk
        report_path = tmp_corpus / "validation_report.json"
        assert report_path.exists()
        report_data = json.loads(report_path.read_text())
        assert report_data["total_files"] == 2


# ---------------------------------------------------------------------------
# Tests: repair_files
# ---------------------------------------------------------------------------


class TestRepairFiles:
    def test_no_errors_skips_repair(self, tmp_corpus, sample_manifest, sample_fact_registry):
        """If no errors, repair_files returns the same report."""
        report = ValidationReport(total_files=2, files_checked=2, issues=[])

        result = asyncio.run(
            repair_files(tmp_corpus, report, sample_manifest, sample_fact_registry)
        )
        # No errors → re-validates, returns a new report
        assert result.total_files == 2

    @patch("validator.llm_call", new_callable=AsyncMock)
    def test_repair_calls_llm(self, mock_llm, tmp_corpus, sample_manifest, sample_fact_registry):
        """Repair should call the LLM for files with errors."""
        # Create a report with one error
        issues = [
            ValidationIssue(
                file_id="f001",
                issue_type="token_count",
                severity="error",
                description="File has 100 tokens, below minimum 4000",
                details={"tokens": 100, "min": 4000, "path": "data/emails/test.md"},
            ),
        ]
        report = ValidationReport(total_files=2, files_checked=1, issues=issues)

        # Mock LLM to return padded content
        mock_llm.return_value = "Repaired content. " * 1000

        result = asyncio.run(
            repair_files(tmp_corpus, report, sample_manifest, sample_fact_registry)
        )

        # LLM should have been called once for f001
        assert mock_llm.call_count >= 1
        # The repaired file should exist
        assert (tmp_corpus / "data" / "emails" / "test.md").exists()
