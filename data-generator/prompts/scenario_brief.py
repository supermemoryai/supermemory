"""Prompt templates for Phase 1: Scenario Brief generation."""

SCENARIO_BRIEF_SYSTEM = """\
You are a world-builder for synthetic eval corpora. Your job is to take a high-level
scenario description and produce a detailed "bible" — the complete ground truth for
an entire organizational corpus.

The corpus simulates a real organization's shared memory: files written by many authors,
in many formats, over a specific time period. Every fact you establish becomes canonical.
Downstream workers will generate individual files from your brief, so you must be
exhaustive and precise.

Key principles:
- Every person has a distinct voice, background, and role
- Dates, dollar amounts, reference numbers, and proper nouns are LOCKED — they must be
  exact and consistent
- The corpus must feel like it was written by real humans, not AI
- Include realistic messiness: typos in casual messages, formal tone in contracts,
  medical jargon in clinical notes, etc.
- Cross-references between files must be explicit and bidirectional
"""

SCENARIO_BRIEF_PROMPT = """\
## Task

Generate a comprehensive SCENARIO.md brief for the following eval data point.

## Input: Scenario Description

{scenario_block}

## Output Requirements

Produce a detailed markdown document with these sections:

### 1. Overview
- Scenario ID, file count, time span, setting
- One-paragraph narrative summary

### 2. Cast of Characters
For EVERY named person:
- Full name, role/title, organization
- Email address (realistic format)
- Timezone, location
- 2-3 personality/writing-style notes (e.g., "writes terse emails", "uses emoji in Slack")
- Key traits relevant to the scenario (dietary restrictions, allergies, expertise areas)
- Relationships to other cast members

### 3. Organizations
For every org/company/institution:
- Full name, type, location
- Key facts (size, industry, founding date if relevant)
- Internal structure relevant to the scenario

### 4. Timeline
A chronological list of every event in the scenario:
- Date (YYYY-MM-DD) and time if relevant
- What happened
- Who was involved
- Which files document this event

### 5. Locked Facts Registry
Every concrete fact that MUST be consistent across files. Group by category:
- **Financial**: dollar amounts, rates, costs, budgets
- **References**: booking refs, case numbers, docket numbers, MRNs, confirmation codes
- **Dates**: deadlines, appointments, milestones
- **Locations**: addresses, room numbers, restaurant names
- **Technical**: system names, version numbers, tool names
- **Medical/Legal/Domain**: diagnoses, statutes, specifications
Each fact must specify: the exact value, which files it appears in, and any context.

### 6. Directory Structure
The exact file tree for the corpus:
```
data/
├── [domain folders]/
│   ├── file1.md
│   └── file2.eml
└── memory/
    ├── profiles/
    └── [other memory subdirs]/
```

### 7. File Manifest
For EVERY file in the corpus, provide:
- **file_id**: f001, f002, ...
- **path**: relative path under data/
- **format**: the document format (markdown_prose, email_thread, transcript, legal_contract,
  lab_report, slack_export, csv_data, json_structured, etc.)
- **author(s)**: who wrote/sent this
- **date**: when this was created/sent
- **target_tokens**: [min, max] within [5000, 10000]
- **summary**: 2-3 sentence description of what this file contains
- **locked_facts**: list of fact IDs from the registry that MUST appear in this file
- **cross_references**: list of other file_ids this file references or is referenced by
- **tone**: formal/casual/clinical/technical/etc.
- **format_notes**: specific formatting requirements (email headers, transcript speaker
  labels, legal clause numbering, etc.)

### 8. Cross-Reference Map
A table showing every cross-reference between files:
| Source File | Target File | What's Referenced | Direction |
|-------------|-------------|-------------------|-----------|

### 9. Eval Stressor Notes
Which eval stressors this scenario tests and how:
- Single-hop retrieval targets
- Multi-hop chains (file A → file B → file C)
- Format-spanning queries (answer requires info from different file formats)
- Edit-then-recall patterns
- Profile/cheap-read targets

### 10. Anti-Pattern Warnings
Specific instructions for file generators to avoid AI-perfection:
- Which files should have typos or informal language
- Where noise/filler content should appear
- Which files should have near-zero extractable facts
- Where information should be buried rather than prominent

## Important
- Generate {file_count} files total, no more, no less
- Every file must target 5,000-10,000 tokens
- The memory/ directory must contain the querier's profile and relevant reference docs
- Do NOT reuse names from other scenarios (cross-scenario isolation)
- Be exhaustive — downstream workers will generate files from this brief alone
"""


def format_scenario_brief_prompt(scenario_block: str, file_count: int) -> str:
    """Format the scenario brief prompt with the scenario description."""
    return SCENARIO_BRIEF_PROMPT.format(
        scenario_block=scenario_block,
        file_count=file_count,
    )
