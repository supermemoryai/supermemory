"""Phase 5: Parallel file generation workers.

Takes clusters of file entries, a fact registry shard, and optionally
already-generated files for cross-reference context.  Generates each file
sequentially within a cluster, passing previously generated files as context.
Clusters at the same topological level run in parallel.
"""

from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path
from typing import Any

from prompts.file_gen import format_file_gen_prompt, format_retry_prompt
from utils import (
    DEFAULT_MODEL,
    GenerationLog,
    count_tokens,
    llm_call,
    read_text,
    truncate_to_tokens,
    write_text,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_CONTEXT_TOKENS_PER_FILE = 3000
MAX_TOTAL_CONTEXT_TOKENS = 15000
MAX_RETRIES = 2

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_cluster_file_ids(cluster: Any) -> list[str]:
    """Extract file IDs from a cluster object's ``file_entries`` list."""
    if hasattr(cluster, "file_entries"):
        return [e.get("file_id", "") for e in cluster.file_entries if e.get("file_id")]
    raise TypeError(
        f"Cluster object has no 'file_entries' attribute: {type(cluster)}"
    )


def _build_context_files(
    file_entry: dict,
    generated: dict[str, str],
    manifest_entries: dict[str, dict],
) -> dict[str, str]:
    """Build the context dict for cross-referenced files.

    Priority:
    - If the referenced file has been generated: include its content (up to
      ``MAX_CONTEXT_TOKENS_PER_FILE`` tokens).
    - If not yet generated: the brief from the manifest is used later by the
      prompt builder (via ``manifest_entries``), so we don't duplicate it here.

    If total context would exceed ``MAX_TOTAL_CONTEXT_TOKENS``, we keep the
    files with the most cross-references first and drop the rest.
    """
    cross_refs: list[str] = file_entry.get("cross_references", [])
    if not cross_refs:
        return {}

    # Collect available generated content for referenced files
    candidates: list[tuple[str, str]] = []
    for ref_id in cross_refs:
        content = generated.get(ref_id)
        if content is not None:
            truncated = truncate_to_tokens(content, MAX_CONTEXT_TOKENS_PER_FILE)
            candidates.append((ref_id, truncated))

    # Sort by number of cross-references each candidate has (most connected first)
    def _xref_count(file_id: str) -> int:
        entry = manifest_entries.get(file_id, {})
        return len(entry.get("cross_references", []))

    candidates.sort(key=lambda pair: _xref_count(pair[0]), reverse=True)

    # Enforce total context budget
    context: dict[str, str] = {}
    total_tokens = 0
    for fid, content in candidates:
        tok = count_tokens(content)
        if total_tokens + tok > MAX_TOTAL_CONTEXT_TOKENS:
            # Try to fit a smaller portion
            remaining = MAX_TOTAL_CONTEXT_TOKENS - total_tokens
            if remaining > 200:
                content = truncate_to_tokens(content, remaining)
                context[fid] = content
            break
        context[fid] = content
        total_tokens += tok

    return context


def _validate_content(
    content: str,
    file_entry: dict,
    fact_shard: dict,
) -> list[str]:
    """Validate generated content.  Returns a list of issue descriptions (empty = valid)."""
    issues: list[str] = []
    token_count = count_tokens(content)

    # --- Token range check ---
    target_tokens = file_entry.get("target_tokens", [5000, 10000])
    target_min = target_tokens[0] if isinstance(target_tokens, list) else 5000
    target_max = target_tokens[1] if isinstance(target_tokens, list) else 10000

    if token_count < target_min:
        issues.append(
            f"Too short: {token_count:,} tokens (minimum {target_min:,}). "
            f"Add more realistic content, filler, and noise."
        )
    elif token_count > target_max * 1.3:
        # Allow 30% overshoot before flagging — slight overshoot is better than
        # being too short.
        issues.append(
            f"Too long: {token_count:,} tokens (maximum ~{target_max:,}). "
            f"Trim some filler while keeping all locked facts."
        )

    # --- Locked facts spot-check ---
    locked_ids = set(file_entry.get("locked_facts", []))
    if locked_ids:
        content_lower = content.lower()
        missing_facts: list[str] = []
        for category in ("financial", "dates", "references", "locations", "domain_facts"):
            for fact in fact_shard.get(category, []):
                if fact.get("id") not in locked_ids:
                    continue
                # Determine key values to check in the content
                key_values = _extract_key_values(fact, category)
                found_any = any(
                    kv.lower() in content_lower for kv in key_values if kv
                )
                if not found_any and key_values:
                    missing_facts.append(
                        f"{fact['id']} (expected one of: {key_values})"
                    )
        if missing_facts:
            issues.append(
                "Missing locked facts — the following facts were not found "
                "in the generated content:\n  "
                + "\n  ".join(missing_facts)
            )

    return issues


def _extract_key_values(fact: dict, category: str) -> list[str]:
    """Extract the key string values from a fact that should appear in the document."""
    values: list[str] = []
    if category == "financial":
        val = fact.get("value", "")
        if val:
            values.append(val)
    elif category == "dates":
        date_val = fact.get("date", "")
        if date_val:
            values.append(date_val)
        time_val = fact.get("time", "")
        if time_val:
            values.append(time_val)
    elif category == "references":
        val = fact.get("value", "")
        if val:
            values.append(val)
    elif category == "locations":
        name = fact.get("name", "")
        if name:
            values.append(name)
        addr = fact.get("address", "")
        if addr:
            values.append(addr)
    elif category == "domain_facts":
        fact_text = fact.get("fact", "")
        if fact_text:
            # For domain facts, check for the first significant clause
            # (whole fact string may be too long to match literally)
            values.append(fact_text)
    return values


# ---------------------------------------------------------------------------
# Core generation
# ---------------------------------------------------------------------------


async def generate_file(
    file_entry: dict,
    fact_shard: dict,
    context_files: dict[str, str],
    output_dir: Path,
    model: str = DEFAULT_MODEL,
    gen_log: GenerationLog | None = None,
    manifest_entries: dict[str, dict] | None = None,
) -> str:
    """Generate a single file.  Returns the generated content.

    Args:
        file_entry: manifest entry for this file.
        fact_shard: relevant portion of fact registry.
        context_files: already-generated files this file cross-references
            (file_id -> content).
        output_dir: base output directory.  File is written to
            ``output_dir / <path>`` (manifest paths already include ``data/``).
        model: LLM model to use.
        gen_log: optional generation log for tracking.
        manifest_entries: full file_id -> manifest entry map (used for
            cross-reference briefs of not-yet-generated files).
    """
    file_id: str = file_entry.get("file_id", "unknown")
    file_path_rel: str = file_entry.get("path", f"data/{file_id}.md")
    dest = output_dir / file_path_rel

    # --- Resume support ---
    if gen_log and gen_log.is_done(file_id):
        logger.info("Skipping %s — already done (gen_log)", file_id)
        if dest.exists():
            return read_text(dest)
        # Log says done but file missing — regenerate
        logger.warning("%s marked done but file missing, regenerating", file_id)

    if dest.exists() and gen_log is None:
        logger.info("Skipping %s — file exists on disk", file_id)
        return read_text(dest)

    # --- Build prompt ---
    system_prompt, user_prompt = format_file_gen_prompt(
        file_entry=file_entry,
        fact_shard=fact_shard,
        context_files=context_files,
        manifest_entries=manifest_entries or {},
    )

    # --- Generate with retries ---
    content: str = ""
    last_issues: list[str] = []
    retries_used = 0
    t0 = time.monotonic()

    for attempt in range(1 + MAX_RETRIES):
        try:
            if attempt == 0:
                content = await llm_call(
                    user_prompt,
                    system=system_prompt,
                    model=model,
                    max_tokens=16384,
                )
            else:
                # Retry with feedback
                retry_prompt = format_retry_prompt(
                    issues=last_issues,
                    previous_content=content,
                    original_prompt=user_prompt,
                )
                content = await llm_call(
                    retry_prompt,
                    system=system_prompt,
                    model=model,
                    max_tokens=16384,
                )

            retries_used = attempt

            # Strip any markdown code fences the LLM might have wrapped around output
            content = _strip_wrapping_fences(content)

            # Validate
            last_issues = _validate_content(content, file_entry, fact_shard)
            if not last_issues:
                break
            logger.warning(
                "%s attempt %d validation issues: %s",
                file_id,
                attempt + 1,
                last_issues,
            )
        except Exception as exc:
            logger.error("%s attempt %d error: %s", file_id, attempt + 1, exc)
            last_issues = [f"Generation error: {exc}"]
            if attempt == MAX_RETRIES:
                # All retries exhausted — log failure and return whatever we have
                elapsed = time.monotonic() - t0
                if gen_log:
                    gen_log.log_file(
                        file_id,
                        model=model,
                        retries=retries_used,
                        status="failed",
                        error=str(exc),
                        elapsed_s=elapsed,
                    )
                logger.error(
                    "Failed to generate %s after %d attempts: %s",
                    file_id,
                    MAX_RETRIES + 1,
                    exc,
                )
                return content

    elapsed = time.monotonic() - t0

    # Even if there are remaining issues after all retries, write the best attempt
    status = "ok" if not last_issues else "partial"
    if last_issues:
        logger.warning(
            "%s: writing with unresolved issues after %d retries: %s",
            file_id,
            retries_used,
            last_issues,
        )

    # Write to disk
    write_text(dest, content)
    logger.info(
        "Generated %s (%d tokens, %d retries, %.1fs) -> %s",
        file_id,
        count_tokens(content),
        retries_used,
        elapsed,
        dest,
    )

    # Log
    if gen_log:
        gen_log.log_file(
            file_id,
            model=model,
            tokens_out=count_tokens(content),
            retries=retries_used,
            status=status,
            error="; ".join(last_issues) if last_issues else None,
            elapsed_s=elapsed,
        )

    return content


def _strip_wrapping_fences(text: str) -> str:
    """Remove markdown code fences that an LLM might wrap around the output."""
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.split("\n")
        # Remove opening fence (e.g. ```markdown, ```text, ```)
        if lines[0].startswith("```"):
            lines = lines[1:]
        # Remove closing fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines)
    return text


# ---------------------------------------------------------------------------
# Cluster-level generation
# ---------------------------------------------------------------------------


async def generate_cluster(
    cluster: Any,
    manifest_entries: dict[str, dict],
    fact_shard: dict,
    output_dir: Path,
    context_files: dict[str, str],
    model: str = DEFAULT_MODEL,
    gen_log: GenerationLog | None = None,
) -> dict[str, str]:
    """Generate all files in a cluster sequentially.

    Returns dict of file_id -> content for all generated files.
    Each file in the cluster sees previously generated files as context.

    Args:
        cluster: a Cluster object with ``file_entries`` (list[dict]) and
            ``level`` (int).  Each entry dict must contain a ``file_id`` key.
        manifest_entries: file_id -> manifest entry for ALL files.
        fact_shard: the fact registry (or relevant shard).
        output_dir: base output directory.
        context_files: files from dependency clusters (file_id -> content).
        model: LLM model to use.
        gen_log: optional generation log.
    """
    # Merge dependency context with what we generate in this cluster
    combined_context: dict[str, str] = dict(context_files)
    generated: dict[str, str] = {}

    # Extract ordered file IDs from the cluster's file_entries list
    file_ids = _get_cluster_file_ids(cluster)

    for file_id in file_ids:
        entry = manifest_entries.get(file_id)
        if entry is None:
            logger.warning(
                "File %s in cluster but not in manifest — skipping", file_id
            )
            continue

        # Build cross-reference context for this specific file
        file_context = _build_context_files(entry, combined_context, manifest_entries)

        content = await generate_file(
            file_entry=entry,
            fact_shard=fact_shard,
            context_files=file_context,
            output_dir=output_dir,
            model=model,
            gen_log=gen_log,
            manifest_entries=manifest_entries,
        )
        generated[file_id] = content
        combined_context[file_id] = content

    return generated


# ---------------------------------------------------------------------------
# Top-level orchestrator
# ---------------------------------------------------------------------------


async def generate_all(
    clusters: list[Any],
    manifest_entries: dict[str, dict],
    output_dir: Path,
    model: str = DEFAULT_MODEL,
    max_concurrent: int = 10,
    gen_log: GenerationLog | None = None,
    fallback_fact_registry: dict | None = None,
) -> None:
    """Generate all files across all clusters, respecting topological order.

    Clusters at the same ``level`` run in parallel (up to *max_concurrent*).
    Clusters at different levels run sequentially (lower levels first).

    Each cluster uses its own ``cluster.fact_shard`` (set by the clusterer's
    sharding logic).  If a cluster has no ``fact_shard`` attribute or it is
    empty, *fallback_fact_registry* is used instead.

    Args:
        clusters: list of Cluster-like objects, **already ordered by level**.
            Each should have a ``fact_shard`` attribute (dict) set by the
            clusterer.
        manifest_entries: file_id -> manifest entry for ALL files.
        output_dir: base output directory.
        model: LLM model to use.
        max_concurrent: maximum number of clusters processed in parallel
            within a single level.
        gen_log: optional generation log.
        fallback_fact_registry: full fact registry used when a cluster has no
            ``fact_shard``.
    """
    # Group clusters by level
    levels: dict[int, list[Any]] = {}
    for cluster in clusters:
        level = getattr(cluster, "level", 0)
        levels.setdefault(level, []).append(cluster)

    # All generated content so far (shared across levels)
    all_generated: dict[str, str] = {}

    for level_num in sorted(levels.keys()):
        level_clusters = levels[level_num]
        logger.info(
            "Level %d: processing %d cluster(s) (up to %d concurrent)",
            level_num,
            len(level_clusters),
            max_concurrent,
        )

        sem = asyncio.Semaphore(max_concurrent)

        async def _run_cluster(c: Any) -> dict[str, str]:
            async with sem:
                # Use the cluster's own sharded fact registry; fall back to
                # the full registry if the cluster doesn't have one.
                cluster_facts = getattr(c, "fact_shard", None) or {}
                if not cluster_facts and fallback_fact_registry:
                    cluster_facts = fallback_fact_registry

                # Snapshot current generated content as context for this cluster
                return await generate_cluster(
                    cluster=c,
                    manifest_entries=manifest_entries,
                    fact_shard=cluster_facts,
                    output_dir=output_dir,
                    context_files=dict(all_generated),
                    model=model,
                    gen_log=gen_log,
                )

        results = await asyncio.gather(
            *(_run_cluster(c) for c in level_clusters),
            return_exceptions=True,
        )

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                try:
                    cluster_ids = _get_cluster_file_ids(level_clusters[i])
                except Exception:
                    cluster_ids = [f"<cluster index {i}>"]
                logger.error(
                    "Cluster %s at level %d failed: %s",
                    cluster_ids,
                    level_num,
                    result,
                )
            else:
                all_generated.update(result)

    if gen_log:
        summary = gen_log.summary()
        logger.info("Generation complete. Summary: %s", summary)
