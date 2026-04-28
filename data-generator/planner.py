"""Planning module for the eval corpus data generator.

Handles three sequential phases:
  Phase 1 — Scenario Brief (SCENARIO.md)
  Phase 2 — Fact Registry  (facts.json)
  Phase 3 — File Manifest  (manifest.json)
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from utils import (
    DEFAULT_MODEL,
    FAST_MODEL,
    count_tokens,
    llm_call,
    llm_call_json,
    read_text,
    write_json,
    write_text,
)
from prompts.scenario_brief import (
    SCENARIO_BRIEF_SYSTEM,
    format_scenario_brief_prompt,
)
from prompts.fact_registry import (
    FACT_REGISTRY_SYSTEM,
    format_fact_registry_prompt,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

LARGE_CORPUS_THRESHOLD = 50
CHUNK_SIZE = 30

# ---------------------------------------------------------------------------
# Manifest prompt templates
# ---------------------------------------------------------------------------

MANIFEST_SYSTEM = """\
You are a corpus architect. Given a scenario brief and fact registry you must produce
a JSON manifest describing every file in the corpus. Each entry specifies exactly
what a downstream file-generator worker needs to produce that file.

Rules:
- file_id values are sequential: f001, f002, …
- target_tokens [min, max] must both be in [5000, 10000]
- locked_facts lists reference fact IDs from the registry — be exhaustive
- cross_references must be bidirectional (if f001 references f002, f002 references f001)
- cluster_hint groups related files (e.g. "legal", "medical_records", "travel")
- brief is 2-3 sentences describing the file's content
- authors is a list of person IDs from the fact registry
"""

MANIFEST_PROMPT = """\
## Task

Generate a file manifest (JSON array) for the corpus described below.

## Scenario Brief

{scenario_brief}

## Fact Registry

```json
{fact_registry}
```

## Requirements

Generate exactly {file_count} file entries as a JSON array. Each entry must have:

- **file_id**: sequential ID (f001, f002, …)
- **path**: relative path under data/ (e.g. "data/emails/booking_confirmation.eml")
- **format**: document format (markdown_prose, email_thread, transcript, legal_contract, \
lab_report, slack_export, csv_data, json_structured, etc.)
- **authors**: list of person IDs from the fact registry
- **date**: ISO 8601 date (YYYY-MM-DD)
- **target_tokens**: [min, max] both within [5000, 10000]
- **locked_facts**: list of fact IDs from the registry that MUST appear in this file
- **cross_references**: list of other file_ids this file references or is referenced by
- **cluster_hint**: group name for related files
- **brief**: 2-3 sentence description of contents
- **tone**: formal/casual/clinical/technical/etc.
- **format_notes**: specific formatting requirements

Return ONLY a JSON array — no wrapper object, no markdown fences.
"""

OUTLINE_PROMPT = """\
## Task

You are planning a large corpus of {file_count} files. To manage complexity, first
produce a department/section outline that organizes the files into logical groups.

## Scenario Brief (Summary)

{scenario_summary}

## Requirements

Return a JSON object with this structure:
```json
{{
  "sections": [
    {{
      "name": "Section Name",
      "cluster_hint": "section_slug",
      "file_count": 15,
      "description": "What files in this section cover"
    }}
  ]
}}
```

Rules:
- Total file_count across all sections must equal exactly {file_count}
- Each section should have roughly {chunk_size} files (±10)
- Section names should be descriptive (e.g. "Legal Documents", "Medical Records")
- cluster_hint must be a URL-safe slug
"""

SECTION_MANIFEST_PROMPT = """\
## Task

Generate file manifest entries for the "{section_name}" section of the corpus.

## Scenario Brief

{scenario_brief}

## Fact Registry

```json
{fact_registry}
```

## Section Details

- **Section**: {section_name} ({section_description})
- **Cluster Hint**: {cluster_hint}
- **File Count**: {section_file_count}
- **Starting file_id**: f{start_id:03d}

## Requirements

Generate exactly {section_file_count} file entries as a JSON array. Each entry must have:

- **file_id**: sequential starting from f{start_id:03d}
- **path**: relative path under data/ (e.g. "data/{cluster_hint}/filename.ext")
- **format**: document format
- **authors**: list of person IDs from the fact registry
- **date**: ISO 8601 date (YYYY-MM-DD)
- **target_tokens**: [min, max] both within [5000, 10000]
- **locked_facts**: list of fact IDs from the registry that MUST appear in this file
- **cross_references**: list of other file_ids this file references (use IDs from any section)
- **cluster_hint**: "{cluster_hint}"
- **brief**: 2-3 sentence description of contents
- **tone**: formal/casual/clinical/technical/etc.
- **format_notes**: specific formatting requirements

Return ONLY a JSON array — no wrapper object, no markdown fences.
"""


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _validate_fact_registry(registry: dict[str, Any]) -> dict[str, Any]:
    """Validate the fact registry has the expected top-level keys.

    Returns the registry unchanged if valid, raises ValueError otherwise.
    """
    required_keys = {"people", "organizations", "dates"}
    missing = required_keys - set(registry.keys())
    if missing:
        raise ValueError(f"Fact registry missing required keys: {missing}")

    # Validate people entries have 'id' fields
    for person in registry.get("people", []):
        if "id" not in person:
            raise ValueError(f"Person entry missing 'id': {person}")

    return registry


def _validate_manifest_entry(entry: dict[str, Any], idx: int) -> list[str]:
    """Validate a single manifest entry. Returns list of warnings (empty = OK)."""
    warnings: list[str] = []
    required_fields = {
        "file_id", "path", "format", "authors", "date",
        "target_tokens", "locked_facts", "cross_references",
        "cluster_hint", "brief", "tone", "format_notes",
    }
    missing = required_fields - set(entry.keys())
    if missing:
        warnings.append(f"Entry {idx} missing fields: {missing}")

    # Validate target_tokens range
    tokens = entry.get("target_tokens")
    if isinstance(tokens, list) and len(tokens) == 2:
        lo, hi = tokens
        if not (5000 <= lo <= 10000 and 5000 <= hi <= 10000):
            warnings.append(
                f"Entry {idx} target_tokens {tokens} outside [5000, 10000]"
            )
        if lo > hi:
            warnings.append(f"Entry {idx} target_tokens min > max: {tokens}")
    elif tokens is not None:
        warnings.append(f"Entry {idx} target_tokens malformed: {tokens}")

    return warnings


def _validate_manifest(manifest: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validate all manifest entries. Logs warnings but returns the manifest."""
    all_warnings: list[str] = []
    for idx, entry in enumerate(manifest):
        all_warnings.extend(_validate_manifest_entry(entry, idx))

    if all_warnings:
        for w in all_warnings:
            logger.warning(f"Manifest validation: {w}")

    return manifest


def _renumber_manifest(manifest: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Re-number file_ids sequentially (f001, f002, …) and update cross_references."""
    # Build old-id → new-id mapping
    id_map: dict[str, str] = {}
    for idx, entry in enumerate(manifest):
        old_id = entry.get("file_id", "")
        new_id = f"f{idx + 1:03d}"
        id_map[old_id] = new_id
        entry["file_id"] = new_id

    # Remap cross_references
    for entry in manifest:
        refs = entry.get("cross_references", [])
        entry["cross_references"] = [
            id_map.get(ref, ref) for ref in refs
        ]

    return manifest


# ---------------------------------------------------------------------------
# Phase 1: Scenario Brief
# ---------------------------------------------------------------------------


async def generate_scenario_brief(
    scenario_block: str,
    file_count: int,
    output_dir: Path,
    model: str = DEFAULT_MODEL,
) -> str:
    """Phase 1: Generate SCENARIO.md. Returns the brief text."""
    output_path = output_dir / "SCENARIO.md"

    # Resume support: skip if already exists
    if output_path.exists():
        logger.info("Phase 1 skipped — SCENARIO.md already exists")
        return read_text(output_path)

    logger.info("Phase 1: Generating scenario brief …")
    prompt = format_scenario_brief_prompt(scenario_block, file_count)

    brief = await llm_call(
        prompt,
        model=model,
        system=SCENARIO_BRIEF_SYSTEM,
        max_tokens=16384,
    )

    write_text(output_path, brief)
    logger.info(
        "Phase 1 complete — SCENARIO.md written (%d tokens)", count_tokens(brief)
    )
    return brief


# ---------------------------------------------------------------------------
# Phase 2: Fact Registry
# ---------------------------------------------------------------------------


async def extract_fact_registry(
    scenario_brief: str,
    output_dir: Path,
    model: str = DEFAULT_MODEL,
) -> dict:
    """Phase 2: Extract facts.json from SCENARIO.md. Returns the registry dict."""
    output_path = output_dir / "facts.json"

    # Resume support: skip if already exists
    if output_path.exists():
        logger.info("Phase 2 skipped — facts.json already exists")
        data = json.loads(read_text(output_path))
        return data

    logger.info("Phase 2: Extracting fact registry …")
    prompt = format_fact_registry_prompt(scenario_brief)

    registry = await llm_call_json(
        prompt,
        model=model,
        system=FACT_REGISTRY_SYSTEM,
        max_tokens=16384,
    )

    # Handle case where registry is wrapped in a key
    if isinstance(registry, dict) and len(registry) == 1:
        key = next(iter(registry))
        if isinstance(registry[key], dict):
            # Might be double-wrapped; check if inner dict has expected keys
            inner = registry[key]
            if "people" in inner or "organizations" in inner:
                registry = inner

    _validate_fact_registry(registry)
    write_json(output_path, registry)

    fact_count = sum(
        len(v) for v in registry.values() if isinstance(v, list)
    )
    logger.info("Phase 2 complete — facts.json written (%d fact entries)", fact_count)
    return registry


# ---------------------------------------------------------------------------
# Phase 3: File Manifest
# ---------------------------------------------------------------------------


async def _generate_small_manifest(
    scenario_brief: str,
    fact_registry: dict,
    file_count: int,
    model: str,
) -> list[dict]:
    """Generate manifest in a single LLM call (≤50 files)."""
    prompt = MANIFEST_PROMPT.format(
        scenario_brief=scenario_brief,
        fact_registry=json.dumps(fact_registry, indent=2),
        file_count=file_count,
    )

    result = await llm_call_json(
        prompt,
        model=model,
        system=MANIFEST_SYSTEM,
        max_tokens=16384,
    )

    # Handle wrapped response — the LLM may return {"files": [...]} or similar
    if isinstance(result, dict):
        for key in ("files", "manifest", "entries"):
            if key in result and isinstance(result[key], list):
                return result[key]
        # If it's a dict but no known key, look for any list value
        for v in result.values():
            if isinstance(v, list):
                return v
        raise ValueError(
            f"Expected a JSON array for manifest, got dict with keys: {list(result.keys())}"
        )

    if isinstance(result, list):
        return result

    raise ValueError(f"Unexpected manifest response type: {type(result)}")


async def _generate_large_manifest(
    scenario_brief: str,
    fact_registry: dict,
    file_count: int,
    model: str,
) -> list[dict]:
    """Generate manifest in chunks for large corpora (>50 files)."""
    # Summarize the brief if it's very long to keep section prompts under limit
    brief_tokens = count_tokens(scenario_brief)
    if brief_tokens > 6000:
        scenario_summary = scenario_brief[:12000] + "\n\n[… truncated for outline …]"
    else:
        scenario_summary = scenario_brief

    # Step 1: Generate section outline
    logger.info("Phase 3a: Generating section outline for %d files …", file_count)
    outline_prompt = OUTLINE_PROMPT.format(
        file_count=file_count,
        scenario_summary=scenario_summary,
        chunk_size=CHUNK_SIZE,
    )

    outline = await llm_call_json(
        outline_prompt,
        model=model,
        system=MANIFEST_SYSTEM,
        max_tokens=4096,
    )

    sections = outline.get("sections", [])
    if not sections:
        raise ValueError("Outline generation returned no sections")

    # Adjust section file counts to match total exactly
    total_assigned = sum(s["file_count"] for s in sections)
    if total_assigned != file_count:
        diff = file_count - total_assigned
        # Distribute difference across sections
        sections[-1]["file_count"] += diff
        logger.warning(
            "Adjusted last section file_count by %d to match total %d",
            diff,
            file_count,
        )

    logger.info(
        "Outline has %d sections: %s",
        len(sections),
        ", ".join(f'{s["name"]}({s["file_count"]})' for s in sections),
    )

    # Step 2: Generate manifest for each section
    all_entries: list[dict] = []
    current_start_id = 1

    for section in sections:
        section_name = section["name"]
        section_file_count = section["file_count"]
        cluster_hint = section.get("cluster_hint", section_name.lower().replace(" ", "_"))
        section_description = section.get("description", "")

        logger.info(
            "Phase 3b: Generating %d entries for section '%s' (starting f%03d) …",
            section_file_count,
            section_name,
            current_start_id,
        )

        section_prompt = SECTION_MANIFEST_PROMPT.format(
            section_name=section_name,
            scenario_brief=scenario_brief,
            fact_registry=json.dumps(fact_registry, indent=2),
            section_description=section_description,
            cluster_hint=cluster_hint,
            section_file_count=section_file_count,
            start_id=current_start_id,
        )

        result = await llm_call_json(
            section_prompt,
            model=model,
            system=MANIFEST_SYSTEM,
            max_tokens=16384,
        )

        # Extract list from potential wrapper
        entries: list[dict]
        if isinstance(result, list):
            entries = result
        elif isinstance(result, dict):
            for key in ("files", "manifest", "entries"):
                if key in result and isinstance(result[key], list):
                    entries = result[key]
                    break
            else:
                for v in result.values():
                    if isinstance(v, list):
                        entries = v
                        break
                else:
                    raise ValueError(
                        f"Section '{section_name}' returned unexpected dict: "
                        f"{list(result.keys())}"
                    )
        else:
            raise ValueError(
                f"Section '{section_name}' returned unexpected type: {type(result)}"
            )

        all_entries.extend(entries)
        current_start_id += section_file_count

    return all_entries


async def generate_manifest(
    scenario_brief: str,
    fact_registry: dict,
    file_count: int,
    output_dir: Path,
    model: str = DEFAULT_MODEL,
) -> list[dict]:
    """Phase 3: Generate manifest.json. Returns list of file entries."""
    output_path = output_dir / "manifest.json"

    # Resume support: skip if already exists
    if output_path.exists():
        logger.info("Phase 3 skipped — manifest.json already exists")
        data = json.loads(read_text(output_path))
        if isinstance(data, dict) and "files" in data:
            return data["files"]
        return data

    logger.info("Phase 3: Generating manifest for %d files …", file_count)

    if file_count <= LARGE_CORPUS_THRESHOLD:
        manifest = await _generate_small_manifest(
            scenario_brief, fact_registry, file_count, model
        )
    else:
        manifest = await _generate_large_manifest(
            scenario_brief, fact_registry, file_count, model
        )

    # Re-number sequentially and fix cross-references
    manifest = _renumber_manifest(manifest)
    _validate_manifest(manifest)

    write_json(output_path, manifest)
    logger.info("Phase 3 complete — manifest.json written (%d entries)", len(manifest))
    return manifest


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


async def run_planning(
    scenario_block: str,
    file_count: int,
    output_dir: Path,
    model: str = DEFAULT_MODEL,
) -> tuple[str, dict, list[dict]]:
    """Run all three planning phases sequentially.

    Returns (brief, facts, manifest).
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    brief = await generate_scenario_brief(scenario_block, file_count, out, model)
    facts = await extract_fact_registry(brief, out, model)
    manifest = await generate_manifest(brief, facts, file_count, out, model)

    return brief, facts, manifest
