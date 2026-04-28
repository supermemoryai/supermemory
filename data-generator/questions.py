"""Phase 7: Eval Question Generation.

Generates eval questions for a corpus, testing retrieval across four families:
single_hop, multi_hop, format_spanning, and edit_then_recall.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from utils import DEFAULT_MODEL, count_tokens, llm_call_json, read_text, write_json
from prompts.questions import QUESTION_GEN_PROMPT, QUESTION_GEN_SYSTEM

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SMALL_CORPUS_THRESHOLD = 50
MAX_SCENARIO_TOKENS = 2000
MAX_EXCERPT_TOKENS = 500
MAX_TOTAL_EXCERPT_TOKENS = 3000

VALID_FAMILIES = {"single_hop", "multi_hop", "format_spanning", "edit_then_recall"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to approximately max_tokens.

    Uses a rough 4-chars-per-token estimate for speed, then verifies.
    """
    if count_tokens(text) <= max_tokens:
        return text

    # Rough cut, then refine
    char_estimate = max_tokens * 4
    truncated = text[:char_estimate]

    # Trim to last complete sentence or paragraph
    for sep in ("\n\n", "\n", ". ", " "):
        idx = truncated.rfind(sep)
        if idx > char_estimate // 2:
            truncated = truncated[: idx + len(sep)]
            break

    return truncated + "\n\n[… truncated …]"


def _build_scenario_summary(scenario_brief: str) -> str:
    """Build a truncated scenario summary for the prompt."""
    return _truncate_to_tokens(scenario_brief, MAX_SCENARIO_TOKENS)


def _build_fact_summary(fact_registry: dict) -> str:
    """Build a concise summary of key facts from the registry."""
    lines: list[str] = []

    # People — just names and roles
    people = fact_registry.get("people", [])
    if people:
        lines.append("### People")
        for p in people:
            name = p.get("full_name", p.get("id", "unknown"))
            role = p.get("role", "")
            lines.append(f"- {name}: {role}")

    # Financial facts
    financial = fact_registry.get("financial", [])
    if financial:
        lines.append("\n### Financial")
        for f in financial:
            lines.append(f"- {f.get('id', '')}: {f.get('value', '')} — {f.get('description', '')}")

    # References
    references = fact_registry.get("references", [])
    if references:
        lines.append("\n### References")
        for r in references:
            lines.append(f"- {r.get('id', '')}: {r.get('value', '')} ({r.get('type', '')})")

    # Key dates
    dates = fact_registry.get("dates", [])
    if dates:
        lines.append("\n### Key Dates")
        for d in dates:
            lines.append(f"- {d.get('id', '')}: {d.get('date', '')} — {d.get('event', '')}")

    # Domain facts (first 10 only to stay concise)
    domain = fact_registry.get("domain_facts", [])
    if domain:
        lines.append("\n### Domain Facts")
        for df in domain[:10]:
            lines.append(f"- {df.get('id', '')}: {df.get('fact', '')[:100]}")
        if len(domain) > 10:
            lines.append(f"  … and {len(domain) - 10} more")

    # Cross-references summary
    xrefs = fact_registry.get("cross_references", [])
    if xrefs:
        lines.append(f"\n### Cross-References: {len(xrefs)} connections between files")

    return "\n".join(lines)


def _build_manifest_summary(manifest: list[dict]) -> str:
    """Build a concise manifest summary showing file briefs and formats."""
    lines: list[str] = []
    for entry in manifest:
        file_id = entry.get("file_id", "?")
        path = entry.get("path", "?")
        fmt = entry.get("format", "?")
        brief = entry.get("brief", "")
        date = entry.get("date", "")
        locked = entry.get("locked_facts", [])

        line = f"- **{file_id}** `{path}` ({fmt}, {date})"
        if brief:
            line += f": {brief[:120]}"
        if locked:
            line += f" [facts: {', '.join(locked[:5])}{'…' if len(locked) > 5 else ''}]"
        lines.append(line)

    return "\n".join(lines)


def _sample_file_excerpts(
    output_dir: Path,
    manifest: list[dict],
) -> str:
    """Sample excerpts from a few files to ground questions in actual content.

    Only used for small corpora (<=50 files).
    """
    excerpts: list[str] = []
    total_tokens = 0

    # Sample up to 8 files, evenly distributed across the manifest
    sample_count = min(8, len(manifest))
    if sample_count == 0:
        return ""

    step = max(1, len(manifest) // sample_count)
    sampled_entries = manifest[::step][:sample_count]

    for entry in sampled_entries:
        rel_path = entry.get("path", "")
        full_path = output_dir / rel_path
        if not full_path.exists():
            continue

        content = read_text(full_path)
        excerpt = _truncate_to_tokens(content, MAX_EXCERPT_TOKENS)
        excerpt_tokens = count_tokens(excerpt)

        if total_tokens + excerpt_tokens > MAX_TOTAL_EXCERPT_TOKENS:
            break

        file_id = entry.get("file_id", "?")
        excerpts.append(f"### {file_id} ({rel_path})\n{excerpt}")
        total_tokens += excerpt_tokens

    if not excerpts:
        return ""

    return "\n\n---\n\n## Sample File Excerpts\n\n" + "\n\n".join(excerpts)


def _validate_questions(questions: list[dict], manifest: list[dict]) -> list[dict]:
    """Validate and clean up generated questions."""
    valid_paths = {entry.get("path", "") for entry in manifest}
    valid_file_ids = {entry.get("file_id", "") for entry in manifest}

    # Build a file_id -> path mapping for normalization
    id_to_path: dict[str, str] = {}
    for entry in manifest:
        fid = entry.get("file_id", "")
        path = entry.get("path", "")
        if fid and path:
            id_to_path[fid] = path

    validated: list[dict] = []
    for q in questions:
        # Ensure required fields
        if not all(k in q for k in ("id", "family", "prompt", "gold_file_ids", "gold_answer")):
            logger.warning("Skipping question missing required fields: %s", q.get("id", "?"))
            continue

        # Normalize family
        family = q.get("family", "").lower().replace("-", "_")
        if family not in VALID_FAMILIES:
            logger.warning(
                "Question %s has unknown family '%s', keeping as-is",
                q.get("id", "?"),
                family,
            )
        q["family"] = family

        # Normalize gold_file_ids: convert file_ids to paths if needed
        normalized_ids: list[str] = []
        for gid in q.get("gold_file_ids", []):
            if gid in valid_paths:
                normalized_ids.append(gid)
            elif gid in id_to_path:
                normalized_ids.append(id_to_path[gid])
            elif gid in valid_file_ids:
                # It's a valid file_id but has no path mapping (shouldn't happen)
                normalized_ids.append(gid)
            else:
                logger.warning(
                    "Question %s references unknown file '%s'",
                    q.get("id", "?"),
                    gid,
                )
                normalized_ids.append(gid)

        q["gold_file_ids"] = normalized_ids
        validated.append(q)

    return validated


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def generate_questions(
    output_dir: Path,
    scenario_brief: str,
    fact_registry: dict,
    manifest: list[dict],
    model: str = DEFAULT_MODEL,
) -> list[dict]:
    """Generate 10 eval questions for a corpus.

    Reads the generated files to understand what's actually in the corpus,
    then generates questions that test retrieval across the four families.

    Returns list of question dicts and writes to output_dir/question.json.
    """
    output_path = output_dir / "question.json"

    # Resume support: skip if already exists
    if output_path.exists():
        logger.info("Phase 7 skipped — question.json already exists")
        return read_text(output_path)

    logger.info("Phase 7: Generating eval questions …")

    # Build summaries for the prompt (don't pass full file contents — too large)
    scenario_summary = _build_scenario_summary(scenario_brief)
    fact_summary = _build_fact_summary(fact_registry)
    manifest_summary = _build_manifest_summary(manifest)

    # For small corpora, also sample file excerpts to ground the questions
    excerpt_section = ""
    if len(manifest) <= SMALL_CORPUS_THRESHOLD:
        excerpt_section = _sample_file_excerpts(output_dir, manifest)

    prompt = QUESTION_GEN_PROMPT.format(
        scenario_summary=scenario_summary,
        fact_summary=fact_summary,
        manifest_summary=manifest_summary,
    )

    # Append excerpts if available
    if excerpt_section:
        prompt += excerpt_section

    result = await llm_call_json(
        prompt,
        model=model,
        system=QUESTION_GEN_SYSTEM,
        max_tokens=8192,
    )

    # Handle wrapped responses — LLM may return {"questions": [...]}
    questions: list[dict]
    if isinstance(result, list):
        questions = result
    elif isinstance(result, dict):
        for key in ("questions", "eval_questions", "items"):
            if key in result and isinstance(result[key], list):
                questions = result[key]
                break
        else:
            # Look for any list value
            for v in result.values():
                if isinstance(v, list):
                    questions = v
                    break
            else:
                raise ValueError(
                    f"Expected a JSON array for questions, got dict with keys: {list(result.keys())}"
                )
    else:
        raise ValueError(f"Unexpected questions response type: {type(result)}")

    # Validate and clean up
    questions = _validate_questions(questions, manifest)

    # Log distribution
    family_counts: dict[str, int] = {}
    for q in questions:
        fam = q.get("family", "unknown")
        family_counts[fam] = family_counts.get(fam, 0) + 1
    logger.info(
        "Phase 7 complete — %d questions generated: %s",
        len(questions),
        ", ".join(f"{k}={v}" for k, v in sorted(family_counts.items())),
    )

    write_json(output_path, questions)
    return questions
