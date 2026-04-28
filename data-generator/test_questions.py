"""Tests for questions.py — Phase 7: Eval Question Generation."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from questions import (
    MAX_SCENARIO_TOKENS,
    VALID_FAMILIES,
    _build_fact_summary,
    _build_manifest_summary,
    _build_scenario_summary,
    _sample_file_excerpts,
    _validate_questions,
    generate_questions,
)
from utils import truncate_to_tokens as _truncate_to_tokens


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tmp_corpus(tmp_path: Path):
    """Create a minimal corpus directory with sample files."""
    data_dir = tmp_path / "data" / "emails"
    data_dir.mkdir(parents=True)
    (data_dir / "test.md").write_text("This is a test email about project updates.")

    contracts_dir = tmp_path / "data" / "contracts"
    contracts_dir.mkdir(parents=True)
    (contracts_dir / "contract.md").write_text("This is a legal contract between parties.")

    return tmp_path


@pytest.fixture
def sample_manifest():
    return [
        {
            "file_id": "f001",
            "path": "data/emails/test.md",
            "format": "email_thread",
            "authors": ["person_alice"],
            "date": "2026-04-22",
            "target_tokens": [5000, 10000],
            "locked_facts": ["fin_budget", "ref_booking"],
            "cross_references": ["f002"],
            "cluster_hint": "emails",
            "brief": "Email thread discussing Q1 budget allocation and hotel booking",
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
            "brief": "Legal contract for vendor services signed by Alice Johnson",
            "tone": "formal",
            "format_notes": "",
        },
    ]


@pytest.fixture
def sample_fact_registry():
    return {
        "people": [
            {
                "id": "person_alice",
                "full_name": "Alice Johnson",
                "role": "CTO, Acme Corp",
            },
            {
                "id": "person_bob",
                "full_name": "Bob Williams",
                "role": "General Counsel, Acme Corp",
            },
        ],
        "organizations": [
            {"id": "org_acme", "name": "Acme Corp", "type": "company"},
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
        "domain_facts": [
            {
                "id": "domain_spec",
                "category": "technical",
                "fact": "The system uses PostgreSQL 15 with pgvector for embeddings",
                "files": ["f001"],
            },
        ],
        "cross_references": [
            {
                "source_file": "f001",
                "target_file": "f002",
                "fact_ids": ["fin_budget"],
                "description": "Contract references the budget",
            },
        ],
    }


@pytest.fixture
def sample_scenario_brief():
    return (
        "# Scenario: Acme Corp Q1 Planning\n\n"
        "Acme Corp is a mid-size tech company planning their Q1 budget. "
        "Alice Johnson (CTO) is coordinating with Bob Williams (General Counsel) "
        "on vendor contracts and travel arrangements.\n\n"
        "## Timeline\n"
        "- 2026-03-15: Contract signing\n"
        "- 2026-04-22: Project deadline\n"
    )


# ---------------------------------------------------------------------------
# Tests: _truncate_to_tokens
# ---------------------------------------------------------------------------


class TestTruncateToTokens:
    def test_short_text_unchanged(self):
        text = "Short text."
        result = _truncate_to_tokens(text, 1000)
        assert result == text

    def test_long_text_truncated(self):
        text = "Word " * 5000  # ~5000 tokens
        result = _truncate_to_tokens(text, 100, add_suffix=True)
        assert len(result) < len(text)
        assert result.endswith("[… truncated …]")

    def test_truncation_at_boundary(self):
        text = "First sentence. Second sentence. Third sentence. Fourth sentence."
        result = _truncate_to_tokens(text, 2)
        # Should be truncated
        assert len(result) < len(text)


# ---------------------------------------------------------------------------
# Tests: _build_scenario_summary
# ---------------------------------------------------------------------------


class TestBuildScenarioSummary:
    def test_short_brief_unchanged(self, sample_scenario_brief):
        result = _build_scenario_summary(sample_scenario_brief)
        # Short brief should not be truncated
        assert "Acme Corp" in result

    def test_long_brief_truncated(self):
        long_brief = "Context. " * 10000
        result = _build_scenario_summary(long_brief)
        assert len(result) < len(long_brief)


# ---------------------------------------------------------------------------
# Tests: _build_fact_summary
# ---------------------------------------------------------------------------


class TestBuildFactSummary:
    def test_includes_people(self, sample_fact_registry):
        result = _build_fact_summary(sample_fact_registry)
        assert "Alice Johnson" in result
        assert "Bob Williams" in result

    def test_includes_financial(self, sample_fact_registry):
        result = _build_fact_summary(sample_fact_registry)
        assert "$2,034.50" in result

    def test_includes_references(self, sample_fact_registry):
        result = _build_fact_summary(sample_fact_registry)
        assert "BK-2026-0422" in result

    def test_includes_dates(self, sample_fact_registry):
        result = _build_fact_summary(sample_fact_registry)
        assert "2026-04-22" in result

    def test_includes_domain_facts(self, sample_fact_registry):
        result = _build_fact_summary(sample_fact_registry)
        assert "PostgreSQL" in result

    def test_includes_cross_references_count(self, sample_fact_registry):
        result = _build_fact_summary(sample_fact_registry)
        assert "1 connections" in result

    def test_empty_registry(self):
        result = _build_fact_summary({})
        assert result == ""

    def test_many_domain_facts_truncated(self):
        registry = {
            "domain_facts": [
                {"id": f"df_{i}", "fact": f"Fact number {i} about something"} for i in range(20)
            ],
        }
        result = _build_fact_summary(registry)
        assert "and 10 more" in result


# ---------------------------------------------------------------------------
# Tests: _build_manifest_summary
# ---------------------------------------------------------------------------


class TestBuildManifestSummary:
    def test_includes_file_ids(self, sample_manifest):
        result = _build_manifest_summary(sample_manifest)
        assert "f001" in result
        assert "f002" in result

    def test_includes_paths(self, sample_manifest):
        result = _build_manifest_summary(sample_manifest)
        assert "data/emails/test.md" in result
        assert "data/contracts/contract.md" in result

    def test_includes_formats(self, sample_manifest):
        result = _build_manifest_summary(sample_manifest)
        assert "email_thread" in result
        assert "legal_contract" in result

    def test_includes_briefs(self, sample_manifest):
        result = _build_manifest_summary(sample_manifest)
        assert "budget" in result.lower()

    def test_includes_locked_facts(self, sample_manifest):
        result = _build_manifest_summary(sample_manifest)
        assert "fin_budget" in result

    def test_empty_manifest(self):
        result = _build_manifest_summary([])
        assert result == ""


# ---------------------------------------------------------------------------
# Tests: _sample_file_excerpts
# ---------------------------------------------------------------------------


class TestSampleFileExcerpts:
    def test_samples_existing_files(self, tmp_corpus, sample_manifest):
        result = _sample_file_excerpts(tmp_corpus, sample_manifest)
        assert "f001" in result
        assert "test email" in result.lower()

    def test_empty_manifest(self, tmp_corpus):
        result = _sample_file_excerpts(tmp_corpus, [])
        assert result == ""

    def test_missing_files_skipped(self, tmp_corpus):
        manifest = [
            {"file_id": "f999", "path": "data/nonexistent/file.md"},
        ]
        result = _sample_file_excerpts(tmp_corpus, manifest)
        assert result == ""


# ---------------------------------------------------------------------------
# Tests: _validate_questions
# ---------------------------------------------------------------------------


class TestValidateQuestions:
    def test_valid_questions_pass(self, sample_manifest):
        questions = [
            {
                "id": "q01",
                "family": "single_hop",
                "prompt": "What is the Q1 budget?",
                "gold_file_ids": ["data/emails/test.md"],
                "gold_answer": "$2,034.50",
            },
        ]
        result = _validate_questions(questions, sample_manifest)
        assert len(result) == 1
        assert result[0]["family"] == "single_hop"

    def test_missing_required_fields_skipped(self, sample_manifest):
        questions = [
            {"id": "q01", "family": "single_hop"},  # missing prompt, gold_file_ids, gold_answer
        ]
        result = _validate_questions(questions, sample_manifest)
        assert len(result) == 0

    def test_file_id_normalized_to_path(self, sample_manifest):
        questions = [
            {
                "id": "q01",
                "family": "single_hop",
                "prompt": "What is the Q1 budget?",
                "gold_file_ids": ["f001"],  # file_id instead of path
                "gold_answer": "$2,034.50",
            },
        ]
        result = _validate_questions(questions, sample_manifest)
        assert result[0]["gold_file_ids"] == ["data/emails/test.md"]

    def test_family_normalization(self, sample_manifest):
        questions = [
            {
                "id": "q01",
                "family": "Multi-Hop",
                "prompt": "What is the total cost?",
                "gold_file_ids": ["data/emails/test.md"],
                "gold_answer": "$5,000",
            },
        ]
        result = _validate_questions(questions, sample_manifest)
        assert result[0]["family"] == "multi_hop"

    def test_unknown_file_id_preserved(self, sample_manifest):
        questions = [
            {
                "id": "q01",
                "family": "single_hop",
                "prompt": "Test?",
                "gold_file_ids": ["data/unknown/file.md"],
                "gold_answer": "answer",
            },
        ]
        result = _validate_questions(questions, sample_manifest)
        assert result[0]["gold_file_ids"] == ["data/unknown/file.md"]


# ---------------------------------------------------------------------------
# Tests: generate_questions (integration)
# ---------------------------------------------------------------------------


class TestGenerateQuestions:
    @patch("questions.llm_call_json", new_callable=AsyncMock)
    def test_generates_and_writes(
        self,
        mock_llm,
        tmp_corpus,
        sample_scenario_brief,
        sample_fact_registry,
        sample_manifest,
    ):
        """Integration test: generates questions and writes question.json."""
        mock_llm.return_value = [
            {
                "id": "q01",
                "family": "single_hop",
                "prompt": "What is the Q1 marketing budget?",
                "gold_file_ids": ["data/emails/test.md"],
                "gold_answer": "$2,034.50",
            },
            {
                "id": "q02",
                "family": "multi_hop",
                "prompt": "Who signed the contract and what was the budget?",
                "gold_file_ids": ["data/emails/test.md", "data/contracts/contract.md"],
                "gold_answer": "Alice Johnson signed; budget was $2,034.50",
            },
        ]

        result = asyncio.run(
            generate_questions(
                tmp_corpus,
                sample_scenario_brief,
                sample_fact_registry,
                sample_manifest,
            )
        )

        assert len(result) == 2
        assert result[0]["id"] == "q01"
        assert result[1]["family"] == "multi_hop"

        # Should write to disk
        output_path = tmp_corpus / "question.json"
        assert output_path.exists()
        written = json.loads(output_path.read_text())
        assert len(written) == 2

    @patch("questions.llm_call_json", new_callable=AsyncMock)
    def test_handles_wrapped_response(
        self,
        mock_llm,
        tmp_corpus,
        sample_scenario_brief,
        sample_fact_registry,
        sample_manifest,
    ):
        """LLM may return questions wrapped in a dict."""
        mock_llm.return_value = {
            "questions": [
                {
                    "id": "q01",
                    "family": "single_hop",
                    "prompt": "Test question?",
                    "gold_file_ids": ["f001"],
                    "gold_answer": "Answer",
                },
            ]
        }

        result = asyncio.run(
            generate_questions(
                tmp_corpus,
                sample_scenario_brief,
                sample_fact_registry,
                sample_manifest,
            )
        )

        assert len(result) == 1
        # f001 should be normalized to path
        assert result[0]["gold_file_ids"] == ["data/emails/test.md"]

    def test_resume_support(
        self,
        tmp_corpus,
        sample_scenario_brief,
        sample_fact_registry,
        sample_manifest,
    ):
        """If question.json already exists, it should be returned without LLM call."""
        output_path = tmp_corpus / "question.json"
        existing = [{"id": "q01", "family": "single_hop", "prompt": "Existing?", "gold_file_ids": [], "gold_answer": "yes"}]
        output_path.write_text(json.dumps(existing))

        result = asyncio.run(
            generate_questions(
                tmp_corpus,
                sample_scenario_brief,
                sample_fact_registry,
                sample_manifest,
            )
        )

        # Should return the existing content as a parsed list, not a raw string
        assert isinstance(result, list), f"Expected list, got {type(result)}: {result!r}"
        assert len(result) == 1
        assert result[0]["prompt"] == "Existing?"


# ---------------------------------------------------------------------------
# Tests: prompts/questions.py
# ---------------------------------------------------------------------------


class TestQuestionPrompts:
    def test_system_prompt_exists(self):
        from prompts.questions import QUESTION_GEN_SYSTEM
        assert "single_hop" in QUESTION_GEN_SYSTEM
        assert "multi_hop" in QUESTION_GEN_SYSTEM
        assert "format_spanning" in QUESTION_GEN_SYSTEM
        assert "edit_then_recall" in QUESTION_GEN_SYSTEM

    def test_prompt_template_has_placeholders(self):
        from prompts.questions import QUESTION_GEN_PROMPT
        assert "{scenario_summary}" in QUESTION_GEN_PROMPT
        assert "{fact_summary}" in QUESTION_GEN_PROMPT
        assert "{manifest_summary}" in QUESTION_GEN_PROMPT

    def test_prompt_template_formats(self):
        from prompts.questions import QUESTION_GEN_PROMPT
        result = QUESTION_GEN_PROMPT.format(
            scenario_summary="Test scenario",
            fact_summary="Test facts",
            manifest_summary="Test manifest",
        )
        assert "Test scenario" in result
        assert "Test facts" in result
        assert "gold_file_ids" in result
