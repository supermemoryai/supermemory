"""Prompt templates for Phase 5: Individual file generation."""

FILE_GEN_SYSTEM = """\
You are generating a single realistic document for an eval corpus.
The document must feel like it was written by a real human in a real organization.
It is NOT a summary or a template — it is the actual document itself.

Critical rules:
- Hit the target token count (5,000-10,000 tokens, roughly 20,000-40,000 characters)
- Include ALL locked facts exactly as specified — these are the ground truth
- Match the specified format precisely (email headers for emails, speaker labels for transcripts, etc.)
- Write in the voice of the specified author(s)
- Include realistic noise: tangential discussions, filler, off-topic asides, pleasantries
- Do NOT be too organized or too clean — real documents are messy
- Cross-references to other files should feel natural, not forced
- The document should be self-contained enough to read on its own, but clearly part of a larger corpus
"""

# ---------------------------------------------------------------------------
# Format-specific sub-prompts
# ---------------------------------------------------------------------------

FORMAT_INSTRUCTIONS: dict[str, str] = {
    "email_thread": """\
Format: Email Thread
- Every message MUST have headers: From, To, Cc (if applicable), Date, Subject
- Reply subjects use "Re: ..." prefix
- Include realistic email signatures (name, title, phone, confidentiality disclaimers)
- Thread is ordered chronologically (oldest first)
- Include realistic forwarding artifacts ("---------- Forwarded message ----------")
- Vary reply lengths — some are one-liners, some are paragraphs
- Include the occasional top-posted reply with full quote chain below
""",
    "transcript": """\
Format: Meeting/Call Transcript
- Every utterance starts with a speaker label and timestamp: "[HH:MM:SS] Speaker Name:"
- Include filler words naturally: um, uh, like, you know, I mean, so, right
- Include crosstalk markers: [crosstalk], [overlapping], [inaudible]
- Include non-verbal cues: [laughs], [sighs], [pause], [typing sounds]
- Some speakers interrupt others mid-sentence
- Include an opening attendance/roll call section
- Include off-topic small talk at the beginning and end
""",
    "legal_contract": """\
Format: Legal Contract / Agreement
- Start with a title block: agreement type, date, parties
- Include WHEREAS recital clauses
- Use numbered sections (1., 1.1, 1.1.1) with descriptive headings
- Include a Definitions section near the top
- Use defined terms in Title Case or ALL CAPS with quotes on first use
- Include standard boilerplate: governing law, severability, entire agreement, counterparts
- End with signature blocks (name, title, date lines)
- Use formal legal prose — passive voice, shall/may distinctions
""",
    "slack_export": """\
Format: Slack Channel Export
- Each message has a timestamp and username: "[YYYY-MM-DD HH:MM] @username:"
- Include thread replies indented or marked: "  ↳ [HH:MM] @username:"
- Include emoji reactions: "  :thumbsup: (3)  :eyes: (1)"
- Include @mentions, #channel-references, and :emoji: usage
- Include bot messages (e.g., "/remind", integration notifications)
- Some messages are very short ("lol", "^", "+1", "👍")
- Include edited markers: "(edited)"
- Include file/link sharing: "[shared a file: quarterly_report.pdf]"
""",
    "clinical_note": """\
Format: Clinical / Medical Note
- Follow SOAP format: Subjective, Objective, Assessment, Plan
- Include patient header: MRN, DOB, encounter date, provider, clinic
- Use standard medical abbreviations: pt, hx, dx, tx, prn, bid, tid, qd, etc.
- Include vitals in structured format: BP, HR, RR, Temp, SpO2, Weight
- Include medication lists with dosages and frequencies
- Use ICD-10 codes where appropriate
- Include review of systems (ROS) section
- Assessment uses clinical reasoning language
- Plan includes numbered action items
""",
    "memo": """\
Format: Internal Memo / Memorandum
- Start with a header block: TO, FROM, DATE, RE (or SUBJECT)
- Use formal prose paragraphs
- May include numbered points or bullet lists for action items
- End with a signature or initials
- Tone is professional but can vary by organization culture
- May include "cc:" line at the bottom
""",
    "markdown_prose": """\
Format: Markdown Document
- Use natural markdown formatting: #/##/### headers, **bold**, *italic*
- Include bullet lists, numbered lists, and occasional tables
- Use code blocks if technical content is relevant
- Include hyperlinks (can be realistic URLs or internal wiki links)
- Structure should feel like a real wiki page, report, or documentation
- Can include a table of contents for longer documents
""",
    "profile": """\
Format: Personal / Professional Profile
- Include structured sections: name, role, contact info, bio
- Include professional background and expertise areas
- Include personal details relevant to the scenario (preferences, restrictions, etc.)
- Can be formatted as markdown, YAML-style, or structured text
- Include relevant metadata: timezone, location, team membership
- Feels like an HR system profile or internal directory entry
""",
}

# ---------------------------------------------------------------------------
# Anti-pattern warnings included in every prompt
# ---------------------------------------------------------------------------

ANTI_PATTERN_WARNINGS = """\
## Anti-Pattern Warnings — READ CAREFULLY

You are an AI generating this document. You MUST fight your instincts to be too clean:
- Do NOT use perfect grammar in casual communications (emails, Slack)
- Do NOT make every paragraph equally sized
- Do NOT include a perfect topic sentence for every section
- Do NOT organize information in a neat, logical order — real documents ramble
- Do NOT make facts easy to find — bury some in the middle of unrelated paragraphs
- Do NOT use headers or bullets where the real format wouldn't have them
- Do NOT summarize or conclude unless the format calls for it
- DO include tangential asides, personal anecdotes, and off-topic filler
- DO vary sentence length dramatically
- DO include some redundancy (same point made slightly differently)
- DO include realistic noise that adds length without adding information
"""

# ---------------------------------------------------------------------------
# Main prompt template
# ---------------------------------------------------------------------------

FILE_GEN_PROMPT = """\
## Task

Generate the complete content of the following document. Output ONLY the document \
content — no wrapper, no explanation, no metadata.

## File Brief

- **File ID**: {file_id}
- **Path**: {file_path}
- **Format**: {file_format}
- **Date**: {file_date}
- **Author(s)**: {file_authors}
- **Tone**: {file_tone}
- **Summary**: {file_summary}

## Target Length

{target_length_instructions}

This is critical. The document MUST be long enough. Pad with realistic filler, \
tangential discussion, pleasantries, and noise if needed. A document that is too \
short is a failure.

## Format-Specific Instructions

{format_instructions}

{format_notes}

## Author Information & Writing Style

{author_info}

## Locked Facts — MUST Appear in This Document

The following facts are ground truth. They MUST appear in the generated document \
exactly as specified. Do not alter names, numbers, dates, or reference codes.

{locked_facts}

## Cross-Reference Context

The following are other documents in the corpus that this file references or is \
related to. Use them for context, but do not copy them verbatim. References should \
feel natural.

{cross_reference_context}

{anti_pattern_warnings}

## Final Reminder

- Target: {target_min_chars}-{target_max_chars} characters ({target_min_tokens}-{target_max_tokens} tokens)
- Include ALL locked facts
- Write as the specified author(s), not as an AI
- The document should feel real, messy, and human
- Output ONLY the document content — nothing else
"""

RETRY_FEEDBACK_PROMPT = """\
## Retry: Fix the Following Issues

Your previous attempt had these problems:

{issues}

## Previous Attempt (for reference)

{previous_attempt_truncated}

## Original Instructions

{original_prompt}

Please regenerate the COMPLETE document, fixing all listed issues. \
Output ONLY the document content.
"""


def _build_author_info(file_entry: dict, fact_shard: dict) -> str:
    """Build author information and writing style section from the fact shard."""
    authors = file_entry.get("authors") or file_entry.get("author", [])
    if isinstance(authors, str):
        authors = [authors]

    people = {p["id"]: p for p in fact_shard.get("people", [])}

    parts: list[str] = []
    for author_id in authors:
        person = people.get(author_id)
        if person:
            lines = [
                f"**{person.get('full_name', author_id)}**",
                f"- Role: {person.get('role', 'Unknown')}",
                f"- Email: {person.get('email', 'N/A')}",
                f"- Location: {person.get('location', 'N/A')}",
                f"- Timezone: {person.get('timezone', 'N/A')}",
            ]
            if person.get("writing_style"):
                lines.append(f"- Writing style: {person['writing_style']}")
            if person.get("traits"):
                lines.append(f"- Traits: {', '.join(person['traits'])}")
            if person.get("relationships"):
                rels = "; ".join(
                    f"{k}: {v}" for k, v in person["relationships"].items()
                )
                lines.append(f"- Relationships: {rels}")
            parts.append("\n".join(lines))
        else:
            parts.append(f"**{author_id}** (no detailed profile available)")

    return "\n\n".join(parts) if parts else "No author information available."


def _build_locked_facts(file_entry: dict, fact_shard: dict) -> str:
    """Build the locked facts section for a file."""
    locked_ids = set(file_entry.get("locked_facts", []))
    if not locked_ids:
        return "No specific locked facts for this file."

    fact_lines: list[str] = []

    # Search across all fact categories
    for category in [
        "financial",
        "dates",
        "references",
        "locations",
        "domain_facts",
    ]:
        for fact in fact_shard.get(category, []):
            if fact.get("id") in locked_ids:
                if category == "financial":
                    fact_lines.append(
                        f"- **[{category}]** {fact['id']}: "
                        f"{fact.get('value', '')} — {fact.get('description', '')}"
                    )
                elif category == "dates":
                    date_str = fact.get("date", "")
                    time_str = fact.get("time", "")
                    fact_lines.append(
                        f"- **[{category}]** {fact['id']}: "
                        f"{date_str} {time_str} — {fact.get('event', '')}"
                    )
                elif category == "references":
                    fact_lines.append(
                        f"- **[{category}]** {fact['id']}: "
                        f"{fact.get('value', '')} ({fact.get('type', '')}) — "
                        f"{fact.get('description', '')}"
                    )
                elif category == "locations":
                    fact_lines.append(
                        f"- **[{category}]** {fact['id']}: "
                        f"{fact.get('name', '')} — {fact.get('address', '')} "
                        f"({fact.get('type', '')})"
                    )
                elif category == "domain_facts":
                    fact_lines.append(
                        f"- **[{category}]** {fact['id']}: {fact.get('fact', '')}"
                    )

    # Also check people facts that might be locked
    for person in fact_shard.get("people", []):
        if person.get("id") in locked_ids:
            fact_lines.append(
                f"- **[person]** {person['id']}: "
                f"{person.get('full_name', '')} — {person.get('role', '')}"
            )

    # Also check organizations
    for org in fact_shard.get("organizations", []):
        if org.get("id") in locked_ids:
            fact_lines.append(
                f"- **[organization]** {org['id']}: "
                f"{org.get('name', '')} ({org.get('type', '')})"
            )

    if not fact_lines:
        return (
            f"Locked fact IDs: {', '.join(sorted(locked_ids))}\n"
            "(Could not resolve full details — use the IDs as-is from context.)"
        )

    return "\n".join(fact_lines)


def _build_cross_reference_context(
    file_entry: dict, context_files: dict[str, str], manifest_entries: dict[str, dict]
) -> str:
    """Build the cross-reference context section.

    Args:
        file_entry: the manifest entry for the file being generated.
        context_files: file_id -> content of already-generated files.
        manifest_entries: file_id -> manifest entry for all files (for briefs).
    """
    cross_refs = file_entry.get("cross_references", [])
    if not cross_refs:
        return "No cross-references for this file."

    parts: list[str] = []
    for ref_id in cross_refs:
        if ref_id in context_files:
            parts.append(
                f"### {ref_id} (generated)\n\n{context_files[ref_id]}"
            )
        elif ref_id in manifest_entries:
            entry = manifest_entries[ref_id]
            brief = (
                f"**{ref_id}** — {entry.get('path', 'unknown path')}\n"
                f"Format: {entry.get('format', 'unknown')}\n"
                f"Summary: {entry.get('summary', 'No summary available')}"
            )
            parts.append(f"### {ref_id} (not yet generated — brief only)\n\n{brief}")
        else:
            parts.append(f"### {ref_id}\n\n(No information available)")

    return "\n\n---\n\n".join(parts) if parts else "No cross-references for this file."


def format_file_gen_prompt(
    file_entry: dict,
    fact_shard: dict,
    context_files: dict[str, str],
    manifest_entries: dict[str, dict] | None = None,
) -> tuple[str, str]:
    """Format the file generation prompt.

    Args:
        file_entry: manifest entry for this file.
        fact_shard: relevant portion of fact registry.
        context_files: file_id -> content for already-generated referenced files.
        manifest_entries: file_id -> manifest entry for all files (used for
            cross-reference briefs of not-yet-generated files).

    Returns:
        (system_prompt, user_prompt) tuple.
    """
    if manifest_entries is None:
        manifest_entries = {}

    file_format = file_entry.get("format", "markdown_prose")
    format_instructions = FORMAT_INSTRUCTIONS.get(
        file_format, FORMAT_INSTRUCTIONS["markdown_prose"]
    )
    format_notes = file_entry.get("format_notes", "")
    if format_notes:
        format_notes = f"### Additional Format Notes\n\n{format_notes}"

    # Compute target character counts from token range
    target_tokens = file_entry.get("target_tokens", [5000, 10000])
    target_min_tokens = target_tokens[0] if isinstance(target_tokens, list) else 5000
    target_max_tokens = target_tokens[1] if isinstance(target_tokens, list) else 10000
    target_min_chars = target_min_tokens * 4
    target_max_chars = target_max_tokens * 4

    target_length_instructions = (
        f"- Target: **{target_min_tokens:,}-{target_max_tokens:,} tokens** "
        f"(approximately **{target_min_chars:,}-{target_max_chars:,} characters**)\n"
        f"- This means the document should be LONG. Think 5-10 pages of text.\n"
        f"- Err on the side of MORE content, not less."
    )

    # Build authors string
    authors = file_entry.get("authors") or file_entry.get("author", [])
    if isinstance(authors, list):
        authors_str = ", ".join(str(a) for a in authors)
    else:
        authors_str = str(authors)

    prompt = FILE_GEN_PROMPT.format(
        file_id=file_entry.get("file_id", "unknown"),
        file_path=file_entry.get("path", "unknown"),
        file_format=file_format,
        file_date=file_entry.get("date", "unknown"),
        file_authors=authors_str,
        file_tone=file_entry.get("tone", "neutral"),
        file_summary=file_entry.get("summary", "No summary provided."),
        target_length_instructions=target_length_instructions,
        format_instructions=format_instructions,
        format_notes=format_notes,
        author_info=_build_author_info(file_entry, fact_shard),
        locked_facts=_build_locked_facts(file_entry, fact_shard),
        cross_reference_context=_build_cross_reference_context(
            file_entry, context_files, manifest_entries
        ),
        anti_pattern_warnings=ANTI_PATTERN_WARNINGS,
        target_min_chars=f"{target_min_chars:,}",
        target_max_chars=f"{target_max_chars:,}",
        target_min_tokens=f"{target_min_tokens:,}",
        target_max_tokens=f"{target_max_tokens:,}",
    )

    return FILE_GEN_SYSTEM, prompt


def format_retry_prompt(
    issues: list[str],
    previous_content: str,
    original_prompt: str,
    max_previous_chars: int = 8000,
) -> str:
    """Format a retry prompt with feedback about what went wrong.

    Args:
        issues: list of issue descriptions.
        previous_content: the previous attempt's content (will be truncated).
        original_prompt: the original user prompt.
        max_previous_chars: max characters to include from previous attempt.

    Returns:
        The formatted retry prompt.
    """
    truncated = previous_content[:max_previous_chars]
    if len(previous_content) > max_previous_chars:
        truncated += "\n\n[... truncated ...]"

    issues_str = "\n".join(f"- {issue}" for issue in issues)

    return RETRY_FEEDBACK_PROMPT.format(
        issues=issues_str,
        previous_attempt_truncated=truncated,
        original_prompt=original_prompt,
    )
