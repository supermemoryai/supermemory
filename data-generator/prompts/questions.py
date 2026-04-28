"""Prompt templates for Phase 7: Eval Question Generation."""

QUESTION_GEN_SYSTEM = """You are generating eval questions for a memory retrieval benchmark.
Each question tests whether a system can find and synthesize information from a corpus of files.

Question families:
- single_hop: answer is in one file, straightforward retrieval
- multi_hop: answer requires combining info from 2-3 files
- format_spanning: answer requires info from files in different formats (e.g., email + contract)
- edit_then_recall: answer involves a fact that was updated/changed across files
"""

QUESTION_GEN_PROMPT = """Generate exactly 10 eval questions for this corpus.

## Scenario
{scenario_summary}

## Fact Registry (key facts)
{fact_summary}

## File Manifest
{manifest_summary}

## Distribution
Generate approximately:
- 3 single_hop questions
- 3 multi_hop questions
- 2 format_spanning questions
- 2 edit_then_recall questions

## Output Format
Return a JSON array:
[
  {{
    "id": "q01",
    "family": "single_hop",
    "prompt": "The natural-language question an agent would be asked",
    "gold_file_ids": ["data/path/to/file1.md", "data/path/to/file2.eml"],
    "gold_answer": "The exact answer string"
  }},
  ...
]

Rules:
- gold_file_ids are the file paths (relative to the dp directory) needed to answer
- gold_answer is the literal answer — concise, factual, no hedging
- Questions should feel natural, like a real user asking their AI assistant
- single_hop questions should be answerable from exactly 1 file
- multi_hop questions should require 2-3 files
- format_spanning questions should require files of different formats
- edit_then_recall questions should involve facts that appear differently in different files
- Do NOT ask questions whose answers aren't in the corpus
- Do NOT ask meta-questions about the corpus itself
"""
