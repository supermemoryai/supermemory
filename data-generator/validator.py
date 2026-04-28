"""Phase 6: Cross-Reference & Consistency Audit.

After all files are generated, this module audits the corpus for consistency,
checking token counts, locked fact presence, name consistency, and cross-reference
integrity.
"""

from __future__ import annotations

import calendar
import logging
import re
import statistics
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from utils import FAST_MODEL, count_tokens, llm_call, read_json, read_text, write_json, write_text

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class ValidationIssue:
    file_id: str
    issue_type: str  # "token_count" | "missing_fact" | "name_inconsistency" | "date_inconsistency" | "cross_ref_broken"
    severity: str  # "error" | "warning"
    description: str
    details: dict = field(default_factory=dict)


@dataclass
class ValidationReport:
    total_files: int
    files_checked: int
    issues: list[ValidationIssue] = field(default_factory=list)
    token_stats: dict = field(default_factory=dict)  # min, max, mean, median token counts

    @property
    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "warning"]


# ---------------------------------------------------------------------------
# Token-count bounds (slightly relaxed from 5000-10000 to allow minor variance)
# ---------------------------------------------------------------------------

TOKEN_MIN = 4000
TOKEN_MAX = 10500


# ---------------------------------------------------------------------------
# Internal check helpers
# ---------------------------------------------------------------------------


def _check_file_existence(
    output_dir: Path,
    manifest: list[dict],
) -> list[ValidationIssue]:
    """Check that every file in the manifest exists on disk."""
    issues: list[ValidationIssue] = []
    for entry in manifest:
        file_id = entry.get("file_id", "unknown")
        rel_path = entry.get("path", "")
        full_path = output_dir / rel_path
        if not full_path.exists():
            issues.append(
                ValidationIssue(
                    file_id=file_id,
                    issue_type="file_missing",
                    severity="error",
                    description=f"File not found on disk: {rel_path}",
                    details={"expected_path": str(full_path)},
                )
            )
    return issues


def _check_token_counts(
    output_dir: Path,
    manifest: list[dict],
) -> tuple[list[ValidationIssue], dict[str, int], dict]:
    """Check token counts for every file. Returns (issues, token_map, token_stats)."""
    issues: list[ValidationIssue] = []
    token_map: dict[str, int] = {}  # file_id -> token count

    for entry in manifest:
        file_id = entry.get("file_id", "unknown")
        rel_path = entry.get("path", "")
        full_path = output_dir / rel_path
        if not full_path.exists():
            continue  # already reported by _check_file_existence

        content = read_text(full_path)
        tokens = count_tokens(content)
        token_map[file_id] = tokens

        if tokens < TOKEN_MIN:
            issues.append(
                ValidationIssue(
                    file_id=file_id,
                    issue_type="token_count",
                    severity="error",
                    description=f"File has {tokens} tokens, below minimum {TOKEN_MIN}",
                    details={"tokens": tokens, "min": TOKEN_MIN, "path": rel_path},
                )
            )
        elif tokens > TOKEN_MAX:
            issues.append(
                ValidationIssue(
                    file_id=file_id,
                    issue_type="token_count",
                    severity="error",
                    description=f"File has {tokens} tokens, above maximum {TOKEN_MAX}",
                    details={"tokens": tokens, "max": TOKEN_MAX, "path": rel_path},
                )
            )

    # Compute stats
    counts = list(token_map.values())
    token_stats: dict[str, Any] = {}
    if counts:
        token_stats = {
            "min": min(counts),
            "max": max(counts),
            "mean": round(statistics.mean(counts), 1),
            "median": round(statistics.median(counts), 1),
            "total_files_measured": len(counts),
        }

    return issues, token_map, token_stats


def _normalize_date(date_str: str) -> list[str]:
    """Generate variant string forms of a date for fuzzy matching.

    Given "2026-04-22", returns variants like:
    - "2026-04-22"
    - "April 22, 2026"
    - "Apr 22, 2026"
    - "04/22/2026"
    - "22 April 2026"
    """
    variants: list[str] = [date_str]

    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", date_str)
    if match:
        year, month_s, day_s = match.groups()
        month = int(month_s)
        day = int(day_s)
        if 1 <= month <= 12:
            month_full = calendar.month_name[month]
            month_abbr = calendar.month_abbr[month]
            # "April 22, 2026"
            variants.append(f"{month_full} {day}, {year}")
            # "Apr 22, 2026"
            variants.append(f"{month_abbr} {day}, {year}")
            # "04/22/2026"
            variants.append(f"{month_s}/{day_s}/{year}")
            # "22 April 2026"
            variants.append(f"{day} {month_full} {year}")
            # Without leading zero: "4/22/2026"
            variants.append(f"{month}/{day_s}/{year}")
            # "April 22 2026" (no comma)
            variants.append(f"{month_full} {day} {year}")

    return variants


def _check_locked_facts(
    output_dir: Path,
    manifest: list[dict],
    fact_registry: dict,
) -> list[ValidationIssue]:
    """Check that locked facts appear in the files that reference them.

    Uses pragmatic string matching:
    - Dollar amounts: check the dollar string appears (e.g. "$2,034")
    - Dates: check any common date format variant appears
    - Names: check full name appears at least once
    - Reference codes: exact string match
    """
    issues: list[ValidationIssue] = []

    # Build a lookup: fact_id -> fact dict
    fact_lookup: dict[str, dict] = {}
    for category in ("financial", "references", "dates", "locations", "domain_facts"):
        for fact in fact_registry.get(category, []):
            fid = fact.get("id", "")
            if fid:
                fact_lookup[fid] = {**fact, "_category": category}

    # Also index people by id
    for person in fact_registry.get("people", []):
        pid = person.get("id", "")
        if pid:
            fact_lookup[pid] = {**person, "_category": "people"}

    # Also index organizations by id
    for org in fact_registry.get("organizations", []):
        oid = org.get("id", "")
        if oid:
            fact_lookup[oid] = {**org, "_category": "organizations"}

    for entry in manifest:
        file_id = entry.get("file_id", "unknown")
        rel_path = entry.get("path", "")
        full_path = output_dir / rel_path
        locked_facts = entry.get("locked_facts", [])

        if not full_path.exists() or not locked_facts:
            continue

        content = read_text(full_path)
        content_lower = content.lower()

        for fact_id in locked_facts:
            fact = fact_lookup.get(fact_id)
            if fact is None:
                issues.append(
                    ValidationIssue(
                        file_id=file_id,
                        issue_type="missing_fact",
                        severity="warning",
                        description=f"Locked fact '{fact_id}' not found in fact registry",
                        details={"fact_id": fact_id},
                    )
                )
                continue

            category = fact.get("_category", "")
            found = False

            if category == "financial":
                # Check the dollar amount string appears
                value = fact.get("value", "")
                if value and value in content:
                    found = True

            elif category == "references":
                # Exact string match for reference codes
                value = fact.get("value", "")
                if value and value in content:
                    found = True

            elif category == "dates":
                # Check any date format variant appears
                date_str = fact.get("date", "")
                if date_str:
                    variants = _normalize_date(date_str)
                    for variant in variants:
                        if variant.lower() in content_lower:
                            found = True
                            break

            elif category == "people":
                # Check the full name appears at least once
                full_name = fact.get("full_name", "")
                if full_name and full_name.lower() in content_lower:
                    found = True

            elif category == "organizations":
                # Check the org name appears
                name = fact.get("name", "")
                if name and name.lower() in content_lower:
                    found = True

            elif category == "locations":
                # Check the location name appears
                name = fact.get("name", "")
                if name and name.lower() in content_lower:
                    found = True

            elif category == "domain_facts":
                # Check the fact string appears (partial match)
                fact_text = fact.get("fact", "")
                if fact_text:
                    # Check a significant portion of the fact appears
                    # Use first 40 chars as a reasonable substring
                    snippet = fact_text[:40].lower()
                    if snippet in content_lower:
                        found = True
                    else:
                        # Try individual key terms (words > 5 chars)
                        words = [w for w in fact_text.split() if len(w) > 5]
                        if words and all(w.lower() in content_lower for w in words[:3]):
                            found = True

            else:
                # Unknown category — skip gracefully
                continue

            if not found:
                fact_desc = fact.get("value") or fact.get("full_name") or fact.get("name") or fact.get("date") or fact.get("fact", "")
                issues.append(
                    ValidationIssue(
                        file_id=file_id,
                        issue_type="missing_fact",
                        severity="error",
                        description=f"Locked fact '{fact_id}' ({category}) not found in file content",
                        details={
                            "fact_id": fact_id,
                            "category": category,
                            "expected_value": str(fact_desc)[:200],
                            "path": rel_path,
                        },
                    )
                )

    return issues


def _check_name_consistency(
    output_dir: Path,
    manifest: list[dict],
    fact_registry: dict,
) -> list[ValidationIssue]:
    """Check that person names from the fact registry are spelled consistently.

    Looks for partial name matches that differ from the canonical full_name,
    which could indicate an inconsistency (e.g. "John Smith" vs "Jon Smith").
    """
    issues: list[ValidationIssue] = []

    people = fact_registry.get("people", [])
    if not people:
        return issues

    # Collect all person names
    name_map: dict[str, str] = {}  # last_name_lower -> canonical full_name
    for person in people:
        full_name = person.get("full_name", "")
        if not full_name:
            continue
        parts = full_name.strip().split()
        if len(parts) >= 2:
            last_name = parts[-1].lower()
            name_map[last_name] = full_name

    # For each file, check that if a last name appears, the full canonical name
    # also appears somewhere in the file
    for entry in manifest:
        file_id = entry.get("file_id", "unknown")
        rel_path = entry.get("path", "")
        full_path = output_dir / rel_path
        if not full_path.exists():
            continue

        content = read_text(full_path)
        content_lower = content.lower()

        for last_name_lower, canonical_name in name_map.items():
            # Only check if the last name appears in the file
            if last_name_lower not in content_lower:
                continue

            # Check that the canonical full name also appears
            if canonical_name.lower() not in content_lower:
                # The last name is present but the full canonical name is not.
                # This might be intentional (using just a last name in dialogue),
                # so make it a warning.
                issues.append(
                    ValidationIssue(
                        file_id=file_id,
                        issue_type="name_inconsistency",
                        severity="warning",
                        description=(
                            f"Last name '{last_name_lower}' appears but canonical "
                            f"full name '{canonical_name}' not found in file"
                        ),
                        details={
                            "last_name": last_name_lower,
                            "canonical_name": canonical_name,
                            "path": rel_path,
                        },
                    )
                )

    return issues


def _check_cross_references(
    output_dir: Path,
    manifest: list[dict],
) -> list[ValidationIssue]:
    """Check cross-reference integrity.

    For each cross_reference in the manifest, verify that both source and target
    files exist in the manifest.
    """
    issues: list[ValidationIssue] = []

    # Build set of valid file_ids
    valid_ids = {entry.get("file_id") for entry in manifest}

    # Build set of valid paths
    valid_paths = {entry.get("path") for entry in manifest}

    for entry in manifest:
        file_id = entry.get("file_id", "unknown")
        cross_refs = entry.get("cross_references", [])

        for ref in cross_refs:
            # cross_references can be file_ids or paths
            if ref not in valid_ids and ref not in valid_paths:
                issues.append(
                    ValidationIssue(
                        file_id=file_id,
                        issue_type="cross_ref_broken",
                        severity="error",
                        description=f"Cross-reference '{ref}' does not match any file_id or path in the manifest",
                        details={"reference": ref, "source_file_id": file_id},
                    )
                )

    return issues


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def validate_corpus(
    output_dir: Path,
    manifest: list[dict],
    fact_registry: dict,
) -> ValidationReport:
    """Run all validation checks on a generated corpus.

    Checks:
    1. File existence: every file in the manifest must exist on disk
    2. Token count: every file must have 4000-10500 tokens
    3. Locked facts: for each file, check that its locked_facts appear in the content
    4. Name consistency: person names spelled identically everywhere they appear
    5. Cross-reference integrity: both source and target files must exist
    """
    total_files = len(manifest)
    all_issues: list[ValidationIssue] = []

    logger.info("Phase 6: Validating corpus (%d files) …", total_files)

    # 1. File existence
    existence_issues = _check_file_existence(output_dir, manifest)
    all_issues.extend(existence_issues)

    # Count files that actually exist for reporting
    existing_paths = set()
    for entry in manifest:
        rel_path = entry.get("path", "")
        if (output_dir / rel_path).exists():
            existing_paths.add(rel_path)
    files_checked = len(existing_paths)

    # 2. Token counts
    token_issues, token_map, token_stats = _check_token_counts(output_dir, manifest)
    all_issues.extend(token_issues)

    # 3. Locked facts
    fact_issues = _check_locked_facts(output_dir, manifest, fact_registry)
    all_issues.extend(fact_issues)

    # 4. Name consistency
    name_issues = _check_name_consistency(output_dir, manifest, fact_registry)
    all_issues.extend(name_issues)

    # 5. Cross-reference integrity
    xref_issues = _check_cross_references(output_dir, manifest)
    all_issues.extend(xref_issues)

    report = ValidationReport(
        total_files=total_files,
        files_checked=files_checked,
        issues=all_issues,
        token_stats=token_stats,
    )

    logger.info(
        "Phase 6 complete — %d errors, %d warnings (checked %d/%d files)",
        len(report.errors),
        len(report.warnings),
        files_checked,
        total_files,
    )

    # Write report to disk
    report_path = output_dir / "validation_report.json"
    write_json(
        report_path,
        {
            "total_files": report.total_files,
            "files_checked": report.files_checked,
            "errors": len(report.errors),
            "warnings": len(report.warnings),
            "token_stats": report.token_stats,
            "issues": [
                {
                    "file_id": i.file_id,
                    "issue_type": i.issue_type,
                    "severity": i.severity,
                    "description": i.description,
                    "details": i.details,
                }
                for i in report.issues
            ],
        },
    )

    return report


async def repair_files(
    output_dir: Path,
    report: ValidationReport,
    manifest: list[dict],
    fact_registry: dict,
    model: str = FAST_MODEL,
) -> ValidationReport:
    """Attempt to regenerate files that failed validation.

    Only repairs files with 'error' severity issues.
    Returns a new validation report after repairs.
    """
    error_file_ids = {issue.file_id for issue in report.errors}
    if not error_file_ids:
        logger.info("No errors to repair.")
        return report

    logger.info("Attempting to repair %d files with errors …", len(error_file_ids))

    # Build manifest lookup
    manifest_lookup = {entry["file_id"]: entry for entry in manifest}

    # Build fact lookup
    fact_lookup: dict[str, dict] = {}
    for category in ("financial", "references", "dates", "locations", "domain_facts", "people", "organizations"):
        for fact in fact_registry.get(category, []):
            fid = fact.get("id", "")
            if fid:
                fact_lookup[fid] = {**fact, "_category": category}

    for file_id in error_file_ids:
        entry = manifest_lookup.get(file_id)
        if entry is None:
            logger.warning("Cannot repair %s — not found in manifest", file_id)
            continue

        rel_path = entry.get("path", "")
        full_path = output_dir / rel_path

        # Collect the specific issues for this file
        file_issues = [i for i in report.errors if i.file_id == file_id]
        issue_descriptions = "\n".join(f"- {i.description}" for i in file_issues)

        # Read current content if file exists
        current_content = ""
        if full_path.exists():
            current_content = read_text(full_path)

        # Build list of locked facts with their values
        locked_facts_info = []
        for fact_id in entry.get("locked_facts", []):
            fact = fact_lookup.get(fact_id)
            if fact:
                cat = fact.get("_category", "unknown")
                val = fact.get("value") or fact.get("full_name") or fact.get("name") or fact.get("date") or fact.get("fact", "")
                locked_facts_info.append(f"  - {fact_id} ({cat}): {val}")

        locked_facts_str = "\n".join(locked_facts_info) if locked_facts_info else "  (none)"

        target_tokens = entry.get("target_tokens", [5000, 10000])

        repair_prompt = f"""You are repairing a generated file that failed validation.

## File Details
- file_id: {file_id}
- path: {rel_path}
- format: {entry.get('format', 'unknown')}
- brief: {entry.get('brief', '')}
- tone: {entry.get('tone', '')}
- target tokens: {target_tokens[0]}-{target_tokens[1]}

## Validation Issues
{issue_descriptions}

## Locked Facts (MUST appear in the output)
{locked_facts_str}

## Current Content
{current_content[:8000] if current_content else '(file does not exist — generate from scratch)'}

## Instructions
Rewrite (or generate) the file content to fix ALL validation issues above.
- Ensure the file is between {target_tokens[0]} and {target_tokens[1]} tokens
- Ensure all locked facts appear in the content with their exact values
- Maintain the specified format and tone
- Output ONLY the file content, nothing else — no markdown fences or explanations
"""

        try:
            repaired_content = await llm_call(
                repair_prompt,
                model=model,
                max_tokens=16384,
            )

            # Write repaired file
            write_text(full_path, repaired_content)

            logger.info("Repaired file %s (%s)", file_id, rel_path)

        except Exception as e:
            logger.error("Failed to repair file %s: %s", file_id, e)

    # Re-validate after repairs
    logger.info("Re-validating after repairs …")
    return await validate_corpus(output_dir, manifest, fact_registry)
