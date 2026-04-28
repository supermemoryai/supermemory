#!/usr/bin/env python3
"""CLI entry point for the eval corpus data generator.

Usage:
    # Generate a single data point
    python generate.py dp_001

    # Generate a range of data points
    python generate.py dp_001 dp_005

    # Resume a failed generation
    python generate.py dp_003 --resume

    # Generate only questions for an existing corpus
    python generate.py dp_001 --questions-only

    # Validate an existing corpus
    python generate.py dp_002 --validate-only

    # Use a specific model
    python generate.py dp_001 --model gemini/gemini-2.5-pro

    # Set concurrency
    python generate.py dp_006 --max-concurrent 20
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
import time
from pathlib import Path

from clusterer import assign_clusters
from planner import run_planning
from questions import generate_questions
from utils import DEFAULT_MODEL, GenerationLog, read_json, read_text, write_json
from validator import validate_corpus
from worker import generate_all

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scenario definitions
# ---------------------------------------------------------------------------

# Each dp maps to a scenario block (the text from the eval design doc) and a
# file count.  The scenario_block is the full description that gets passed to
# the planner for world-building.

SCENARIOS: dict[str, dict] = {
    "dp_001": {
        "file_count": 5,
        "scenario_block": """\
## dp_001 — Two-person consulting engagement, day one
- **Files:** 5
- **Realized as:** Orbital Data (boutique data engineering consultancy) signs Coppertide \
(DTC cookware brand). Day one of a 12-week analytics-modernization engagement.
- **Reference date:** 2026-04-22 (kickoff).
- **Querier:** Priya Iyer (co-founder of Orbital, lead consultant; Bangalore tz; \
ex-Stripe, ex-Square; vegetarian, peanut allergy).
- **Cast:** Priya Iyer, Marcus Lehrer (Orbital co-founder, Berlin tz). Coppertide: \
Devansh Mehta (CTO), Aria Tan (Head of Analytics), Quentin Reyes (data eng), \
Lina Costa (VP Marketing).
- **Directory shape:** `client/coppertide/`, `internal/orbital/`, `memory/profiles/`, \
`memory/companies/`.
- **File mix:** signed SoW, detailed kickoff-call transcript, internal engagement plan, \
Priya's persona profile, Coppertide company overview.
- **Eval stressors:** floor case (every surface should pass at 5 files), single-hop, \
multi-hop chaining SoW + kickoff + engagement plan, profile.md cheap-cat for \
vegetarian/allergy/Bangalore facts.
- **Notable cross-references:** Stitch $2,034/mo, Snowflake $800/mo, Looker $1,400/mo, \
Klaviyo 14M rows/day, Spring Pans campaign, Thursday 1 PM ET review cadence, addendum \
due 2026-04-29, 2024 Fivetran/Shopify Plus duplicate-orders memory, SOC 2 \
PII-stays-in-US requirement.
- **Deep brief:** files implicitly carry the brief; consider creating \
`dp_001/SCENARIO.md` retrospectively for parity with dp_002.
""",
    },
    "dp_002": {
        "file_count": 10,
        "scenario_block": """\
## dp_002 — Couple's anniversary weekend trip
- **Files:** 10
- **Realized as:** Ana Sokol + Jordan Lee, long weekend in Portsmouth, NH \
(Fri–Sun 2026-03-27 to 2026-03-29). 5-year dating anniversary.
- **Reference date:** 2026-03-25 (two days before departure).
- **Querier:** Ana Sokol (UX designer at Murex Health, Brooklyn).
- **Cast:** Ana Sokol, Jordan Lee (school librarian, Greene Hill Charter), \
Mira Bhattacharya (college friend in Portsmouth), Tomas Hjelm (college friend \
in Kittery, ME, briefly dated in 2014), Carolyn + Paul Foley (Martin Hill Inn \
innkeepers), Bea Acharya (downstairs neighbor caring for the cat Cipher), \
Yusra Marin (Jordan's librarian colleague), Priya Kuznetsov (Ana's manager — \
first-name collision with dp_001's Priya Iyer; flagged).
- **Directory shape:** `trip/{itinerary,bookings,email,messages,notes}/`, \
`memory/{profiles,places}/`.
- **File mix:** shared itinerary doc, hotel + Amtrak confirmation .eml files with \
threaded replies, restaurants tracking, Mira's recommendation email + Saturday-lunch \
pushback, Tomas's nervous coffee-meetup email, two-week iMessage thread, Jordan's \
separate must-do list, Ana's persona profile, Portsmouth destination overview.
- **Eval stressors:** format-spanning across .eml and .md, multi-hop (Mira pushback \
chains email + restaurants doc), profile.md (Ana's pescatarian-this-trip, reading \
habits, Cipher), edit-then-recall (RiverRun-Bookstore-as-gift secret).
- **Locked facts:** booking refs `AMTKB-9F2RT-3K`, `MHINN-2026-0327-AS`, hotel rate \
$315/night x 2 + $94.50 NH tax + $30 pet deposit waived = $724.50, Amtrak fare \
$478.40 to Visa-4187, Acela 2151 / Downeaster 685 / Downeaster 690 / Acela 2168, \
all named restaurants.
- **Deep brief:** `.scratch/eval/test/dp_002/SCENARIO.md`.
""",
    },
    "dp_003": {
        "file_count": 20,
        "scenario_block": """\
## dp_003 — Single ER patient case across visits
- **Files:** 20
- **Setting:** A single patient case, ER admission through a 3-week follow-up. \
Mid-size urban hospital. Multiple providers touching the chart.
- **Querier:** The attending physician (or, alternatively, the patient themselves \
looking back at their own care). Default: attending.
- **Cast:** ER attending, ER nurse, hospitalist (admit), specialists pulled in \
(e.g., cardiology, GI), discharge planner, outpatient PCP, the patient, possibly \
a family member on the contact log.
- **Directory shape:** `clinical/{admission,progress,specialty}/`, \
`tests/{labs,imaging,reports}/`, `correspondence/{patient,family,provider}/`, \
`memory/profiles/`, `memory/conditions/`.
- **File mix:** ER admission note, triage assessment, lab orders + results \
(sometimes structured), imaging report, specialty consults (2-3), discharge summary, \
prescription notes, follow-up plan, patient symptom journal, billing note, provider \
1:1 patient-handoff note, optional anonymized peer consult, profile of patient, \
condition reference note.
- **Eval stressors:** longitudinal across a 3-week window for a single entity, \
format-spanning (lab CSV-style + imaging PDF transcription + prose progress notes), \
multi-hop (test result -> specialty consult -> med change), edit-then-recall \
(provider notes a follow-up).
- **Realism notes:** anonymized; PHI-shaped formatting (DOB, MRN); HL7-ish lab \
snippets; honest medical jargon density.
""",
    },
    "dp_004": {
        "file_count": 30,
        "scenario_block": """\
## dp_004 — Small-claims legal matter, intake to first hearing
- **Files:** 30
- **Setting:** A solo or two-person law practice handling a small-claims matter \
from intake through the first hearing (~6-week span).
- **Querier:** The lead attorney.
- **Cast:** Lead attorney, paralegal, opposing counsel (one or two), client, court \
clerk, possibly a witness or two.
- **Directory shape:** `client_intake/`, `pleadings/`, \
`correspondence/{client,opposing,court}/`, `research/`, `notes/`, `memory/profiles/`.
- **File mix:** client intake form, retainer agreement, demand letter, court filings \
(complaint, answer, motions), discovery requests + responses, attorney research memos, \
client correspondence (email + texts), opposing counsel correspondence, court \
communications, hearing prep notes, attorney's running case file, profile.
- **Eval stressors:** citation chains within a case (which filing references which \
exhibit), formal-correspondence retrieval, multi-hop (client said X in intake -> \
demand letter cites X -> opposing's answer responds to X), format-spanning across \
legal-PDF-shape and prose memos.
- **Realism notes:** docket numbers, plausible jurisdiction (Delaware or NY \
small-claims), realistic hearing date and motion practice; IP boilerplate \
inappropriate here — small-claims is brief.
""",
    },
    "dp_005": {
        "file_count": 50,
        "scenario_block": """\
## dp_005 — Two-roommate co-living journal
- **Files:** 50
- **Setting:** Two roommates (not a couple) sharing an apartment for ~2 months. \
A shared journal, bills, house rules, ongoing communication, plus each roommate's \
personal notes.
- **Querier:** Either roommate (default: roommate A, designated in deep brief).
- **Cast:** Roommate A, Roommate B, landlord, building maintenance contact, \
occasional guests, neighbors mentioned in passing.
- **Directory shape:** `house/{rules,bills,maintenance}/`, \
`journal/{shared,personal_a,personal_b}/`, `messages/`, `memory/profiles/`.
- **File mix:** ~25 shared journal entries (some by A, some by B), house rules doc, \
monthly bills (Internet, utilities, rent split), Venmo logs, maintenance ticket \
emails, group chat exports, both roommates' personal scratch notes, profile of querier.
- **Eval stressors:** temporal recall ("when did the AC break?"), per-entity \
longitudinal across the two roommates, edit-then-recall, single-hop into specific \
bill files.
- **Realism notes:** small frictions (one tidies more, one cooks more), one shared \
amusement (running joke), realistic two-person banter.
""",
    },
    "dp_006": {
        "file_count": 100,
        "scenario_block": """\
## dp_006 — Indie open-source project, 6 months
- **Files:** 100
- **Setting:** A solo maintainer running a moderately popular open-source project \
(devtool, library, or CLI). 6 months of activity.
- **Querier:** The maintainer.
- **Cast:** The maintainer, ~10-20 community contributors (issue authors, PR \
submitters), 1-2 sponsors or notable users, occasional security-disclosure \
correspondent.
- **Directory shape:** `code/{rfcs,adr}/`, `issues/`, `pr_threads/`, `releases/`, \
`email/{users,sponsors,disclosure}/`, `notes/`, `memory/profiles/`.
- **File mix:** README, RFC and ADR docs, ~50 PR / issue threads (many authors, \
mixed lengths), 6 release-note files (one per month), changelog, sponsor outreach \
emails, security disclosure exchange (one), maintainer's scratch / planning notes, \
profile.
- **Eval stressors:** decision archaeology ("when did we drop Python 3.9 support \
and why?"), multi-hop (issue -> PR -> release note -> user follow-up), code-doc \
cross-references.
- **Realism notes:** GitHub-shaped issue/PR formats, authors with varying tone, \
drive-by issues, helpful regulars.
""",
    },
    "dp_007": {
        "file_count": 200,
        "scenario_block": """\
## dp_007 — Grad-student lab, first semester
- **Files:** 200
- **Setting:** A first-year PhD student's first semester. Lab is part of a larger \
department; advisor + 4 senior peers + a postdoc. Mix of coursework and lab work.
- **Querier:** The first-year PhD student.
- **Cast:** Student, advisor, postdoc, 4 lab peers, ~5 cohort classmates, professors \
of 4 courses, a couple paper authors with whom the student emailed.
- **Directory shape:** `papers/`, `lectures/{course1,course2,course3,course4}/`, \
`lab/{notebook,meetings,literature}/`, `meetings/{advisor,1on1}/`, `email/`, \
`memory/profiles/`.
- **File mix:** ~40 paper PDFs (with extracted-text sidecars), ~50 lecture notes \
(4 courses x ~12 weeks), ~25 problem sets and homework, lab notebook entries, weekly \
advisor 1:1 logs, group lab meeting notes, ~30 emails, departmental announcements, \
profile.
- **Eval stressors:** format-spanning (paper PDFs + sidecars are central), citation \
chains across reading + lecture notes, single-hop into specific lab notebook entries, \
temporal recall across the semester.
- **Realism notes:** real-shape academic correspondence; reading lists with \
annotations; "I should reread this" margin notes.
""",
    },
    "dp_008": {
        "file_count": 300,
        "scenario_block": """\
## dp_008 — Pre-seed startup, first 6 months
- **Files:** 300
- **Setting:** A 5-person pre-seed startup in its first 6 months. Two founders, \
2 early engineers, 1 designer/PM. Plus advisors and investors in correspondence.
- **Querier:** Any founder (default: CEO co-founder).
- **Cast:** 2 founders, 3 early team, 4-6 advisors, 8-12 investors / prospective \
investors, customer-interview subjects (10+), accountants, lawyers (incorporation), \
recruiter contact.
- **Directory shape:** `investors/{outreach,decks,follow_ups}/`, \
`customers/{interviews,demos}/`, `team/{slack,1on1}/`, `hiring/`, `legal/`, \
`decks/`, `memory/profiles/`.
- **File mix:** investor outreach emails, pitch deck iterations (3-4), customer \
interview transcripts (15+), co-founder slack export, hiring email threads, \
accounting/legal incorporation docs, founder's strategy memos, advisor emails, \
profile of querier.
- **Eval stressors:** profile.md heavy (founder context), multi-hop (advisor said \
X -> strategy memo references -> investor pitch reflects), founder-narrative \
coherence over time, edit-then-recall (note today's standup, retrieve next week).
- **Realism notes:** earnest scrappy energy, calendar friction, half-finished \
thoughts, optimism that pivots.
""",
    },
    "dp_009": {
        "file_count": 500,
        "scenario_block": """\
## dp_009 — Small therapy practice, 6 months, 4 therapists
- **Files:** 500
- **Setting:** A 4-therapist practice with a shared admin support, 6-month archive. \
Each therapist has 8-12 active clients, rotating; ~30 unique anonymized clients \
across the practice.
- **Querier:** Any therapist (default: senior therapist, 6-year licensed).
- **Cast:** 4 therapists, 1 admin/billing assistant, ~30 clients (anonymized as \
initials + ID), supervisor (external, monthly), insurance contacts.
- **Directory shape:** `clients/<client_id>/`, `staff/{notes,supervision}/`, \
`admin/{billing,scheduling,intake}/`, `ce_reading/`, `memory/profiles/`.
- **File mix:** ~360 anonymized session notes (12 clients x 30 sessions each on \
average per therapist; partitioned across the 4 therapists), supervisor session \
notes, CE reading notes, conference talk notes, intake forms, insurance \
correspondence, scheduling exports, profile of querier.
- **Eval stressors:** per-client longitudinal across many clients (distractor \
density), careful identity boundaries (do not leak across clients), ethical-shape \
correspondence.
- **Realism notes:** session notes follow SOAP-ish format; tone is careful and \
clinical; ethical boundaries explicit.
""",
    },
    "dp_010": {
        "file_count": 1000,
        "scenario_block": """\
## dp_010 — Growth-stage startup, 6 months, ~50 employees
- **Files:** 1,000
- **Setting:** A Series-A -> Series-B SaaS company, ~50 employees, 6-month archive. \
Multiple teams (eng, product, sales, CX, ops, exec). Multi-channel comms.
- **Querier:** A team lead (eng team lead by default; mid-level manager, ~20 reports \
including ICs and a coordinator).
- **Cast:** ~30-50 named employees (cross-team), 8-12 customers in active threads, \
2-3 vendors, 1 board member.
- **Directory shape:** `slack/{channel}/`, `email/{internal,customers,vendors}/`, \
`docs/{rfcs,post_mortems,playbooks}/`, `projects/{name}/`, `1on1/{report}/`, \
`meetings/{retros,planning,allhands}/`, `memory/profiles/`.
- **File mix:** Slack channel snapshots, email threads, design docs, post-mortems, \
project briefs, weekly 1:1 logs, retros, sprint planning notes, customer call notes, \
vendor correspondence, profile.
- **Eval stressors:** the "default" SMFS use case — broadest test, all four task \
families, multi-hop across people/projects/time, profile.md heavy.
- **Realism notes:** cross-team noise, slack-shape banter, realistic name density.
""",
    },
    "dp_011": {
        "file_count": 2000,
        "scenario_block": """\
## dp_011 — Newsroom investigation, 18 months
- **Files:** 2,000
- **Setting:** A long-form investigative team (4 reporters + 2 editors) on a \
multi-month investigation. 18-month archive.
- **Querier:** Lead reporter.
- **Cast:** 4 reporters, 2 editors, ~20-30 sources (interviewed; varying anonymity), \
FOIA-respondent agencies, fact-checker, libel lawyer, photographer, a competing \
newsroom contact.
- **Directory shape:** `interviews/{audio,transcripts}/`, \
`sources/{notes,protected}/`, `foia/{requests,responses}/`, \
`editorial/{drafts,notes}/`, `published/`, `memory/profiles/`.
- **File mix:** ~50 interview audio transcripts (with sidecar text), source notes, \
FOIA correspondence + response PDFs (transcribed), editor email threads, draft \
article versions (multiple stages), background reading, fact-checking notes, photo \
logs (with image transcriptions), profile.
- **Eval stressors:** format-spanning is the headline (audio transcripts + FOIA \
PDFs), source-protection patterns, multi-hop across sources and documents.
- **Realism notes:** anonymized source IDs, sealed-source protocols, careful \
citation tracking.
""",
    },
    "dp_012": {
        "file_count": 5000,
        "scenario_block": """\
## dp_012 — Embassy at one posting, 3-year archive
- **Files:** 5,000
- **Setting:** A US embassy at one country posting, 3-year archive. Mid-size \
embassy: ~80 American staff, ~120 locally-employed staff, regular cable traffic.
- **Querier:** A mid-career FSO (Foreign Service Officer) on her second posting.
- **Cast:** US staff (DCM, political officer, econ officer, consular officers, RSO, \
defense attache, public affairs, Marine guard chief), locally-employed staff (LE \
staff key contacts), foreign-government counterparts (~30 named), regional NGO \
contacts, US-side desk officers in DC.
- **Directory shape:** `cables/{outgoing,incoming}/`, \
`briefings/{principals,vips}/`, `country/{political,economic,security}/`, \
`meetings/{readouts}/`, `personnel/`, `consular/`, `crisis/`, `memory/profiles/`.
- **File mix:** ~2,000 cables (varied classification levels reflected in metadata), \
briefing memos for visiting principals, country reports, meeting readouts, consular \
incident logs, crisis-response files, personnel-management notes, profile.
- **Eval stressors:** cross-relationship reasoning across foreign counterparts and \
DC desk officers, hierarchical surfaces (memos to ambassador, memos from DCM), \
classified-shape filing without inventing real classifications, temporal recall \
across postings.
- **Realism notes:** State-cable formatting (subjects, refs, drafted-by, cleared-by), \
realistic countries-fictional pairing (do not name a real geopolitical incident), \
tone is professional and indirect.
""",
    },
    "dp_013": {
        "file_count": 10000,
        "scenario_block": """\
## dp_013 — Tech-company CEO, full annual archive
- **Files:** 10,000
- **Setting:** A Series-B / early-Series-C tech company, ~300 employees, full \
12-month archive of the CEO's communications and accessible memory. Multiple \
departments, multiple ongoing projects, board, investors, customers, hiring, \
finance, HR.
- **Querier:** The CEO (or chief of staff acting on behalf).
- **Cast:** 200-500 named individuals: ~300 internal employees (sampled — most \
active 100 appear repeatedly), ~30 board / investors, ~50 customers in active \
threads, ~20 vendors, ~30 candidate threads, family / personal life mixed in \
lightly, ~10 industry peers.
- **Directory shape:** \
`departments/{eng,product,sales,cx,ops,marketing,hr,finance,legal}/`, \
`projects/{name}/`, `slack/{channel}/`, `email/{internal,external,personal}/`, \
`board/{decks,minutes,prep}/`, `customers/{escalations,calls}/`, \
`hiring/{panels,decisions}/`, `finance/{reports,decisions}/`, \
`hr/{policies,sensitive}/`, `media/{interviews,press}/`, `memory/profiles/`.
- **File mix:** board decks and minutes, weekly 1:1 transcripts with 8 directs \
(x 52 weeks ~ 416), department-head reports, all-hands transcripts, hiring panel \
feedback, financial reports, HR matters (with care), customer escalation threads, \
strategy memos, investor communications, media interviews, industry-conference \
talks, daily executive-assistant briefings, personal email mixed in, profile.
- **Eval stressors:** highest-stakes profile.md (CEO context), multi-thread \
synthesis at scale, all four task families, edit-then-recall is high-stakes \
("Maya, write the board prep note for next quarter"), distractor robustness \
because of sheer corpus size.
- **Realism notes:** CEO voice is consistent across all CEO-authored files; varied \
tones across the named cast; realistic confidentiality boundaries on HR / financial \
files; strategy-decision arcs trace across multiple files.
""",
    },
}


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


async def run_pipeline(
    dp_id: str,
    *,
    output_base: Path,
    model: str = DEFAULT_MODEL,
    max_concurrent: int = 10,
    questions_only: bool = False,
    validate_only: bool = False,
    resume: bool = False,
) -> None:
    """Run the full generation pipeline for a single data point."""
    scenario = SCENARIOS.get(dp_id)
    if scenario is None:
        raise ValueError(f"Unknown data point: {dp_id}. Available: {sorted(SCENARIOS.keys())}")

    file_count = scenario["file_count"]
    scenario_block = scenario["scenario_block"]
    output_dir = output_base / dp_id

    logger.info("=" * 60)
    logger.info("Starting %s (%d files)", dp_id, file_count)
    logger.info("Output: %s", output_dir)
    logger.info("Model: %s", model)
    logger.info("=" * 60)

    # --- Validate-only mode ---
    if validate_only:
        manifest_path = output_dir / "manifest.json"
        facts_path = output_dir / "facts.json"
        if not manifest_path.exists() or not facts_path.exists():
            logger.error("Cannot validate: manifest.json or facts.json missing in %s", output_dir)
            return
        manifest = read_json(manifest_path)
        facts = read_json(facts_path)
        report = await validate_corpus(output_dir, manifest, facts)
        logger.info("Validation: %d errors, %d warnings out of %d files",
                     len(report.errors), len(report.warnings), report.total_files)
        write_json(output_dir / "validation_report.json", {
            "total_files": report.total_files,
            "files_checked": report.files_checked,
            "errors": len(report.errors),
            "warnings": len(report.warnings),
            "token_stats": report.token_stats,
            "issues": [
                {"file_id": i.file_id, "type": i.issue_type, "severity": i.severity,
                 "description": i.description}
                for i in report.issues
            ],
        })
        return

    # --- Questions-only mode ---
    if questions_only:
        scenario_path = output_dir / "SCENARIO.md"
        facts_path = output_dir / "facts.json"
        manifest_path = output_dir / "manifest.json"
        if not all(p.exists() for p in [scenario_path, facts_path, manifest_path]):
            logger.error("Cannot generate questions: missing SCENARIO.md, facts.json, or manifest.json")
            return
        brief = read_text(scenario_path)
        facts = read_json(facts_path)
        manifest = read_json(manifest_path)
        questions = await generate_questions(output_dir, brief, facts, manifest, model=model)
        logger.info("Generated %d questions -> %s/question.json", len(questions), output_dir)
        return

    # --- Full pipeline ---
    t0 = time.monotonic()

    # Phase 1-3: Planning
    logger.info("--- PLANNING (Phases 1-3) ---")
    brief, facts, manifest = await run_planning(
        scenario_block=scenario_block,
        file_count=file_count,
        output_dir=output_dir,
        model=model,
    )
    logger.info("Planning complete: %d facts categories, %d manifest entries",
                len(facts), len(manifest))

    # Phase 4: Clustering
    logger.info("--- CLUSTERING (Phase 4) ---")
    clusters = assign_clusters(manifest, facts)
    logger.info("Created %d clusters across %d levels",
                len(clusters), max(c.level for c in clusters) + 1 if clusters else 0)

    # Phase 5: File generation
    logger.info("--- GENERATION (Phase 5) ---")
    gen_log = GenerationLog(output_dir / "generation_log.json")

    # Build manifest lookup
    manifest_entries = {e["file_id"]: e for e in manifest}

    await generate_all(
        clusters=clusters,
        manifest_entries=manifest_entries,
        output_dir=output_dir,
        model=model,
        max_concurrent=max_concurrent,
        gen_log=gen_log,
        fallback_fact_registry=facts,
    )

    gen_summary = gen_log.summary()
    logger.info("Generation summary: %s", gen_summary)

    # Phase 6: Validation
    logger.info("--- VALIDATION (Phase 6) ---")
    report = await validate_corpus(output_dir, manifest, facts)
    logger.info("Validation: %d errors, %d warnings out of %d files",
                len(report.errors), len(report.warnings), report.total_files)

    write_json(output_dir / "validation_report.json", {
        "total_files": report.total_files,
        "files_checked": report.files_checked,
        "errors": len(report.errors),
        "warnings": len(report.warnings),
        "token_stats": report.token_stats,
        "issues": [
            {"file_id": i.file_id, "type": i.issue_type, "severity": i.severity,
             "description": i.description}
            for i in report.issues
        ],
    })

    # Phase 7: Questions
    logger.info("--- QUESTIONS (Phase 7) ---")
    questions = await generate_questions(output_dir, brief, facts, manifest, model=model)
    logger.info("Generated %d questions", len(questions))

    elapsed = time.monotonic() - t0
    logger.info("=" * 60)
    logger.info("%s complete in %.1f minutes", dp_id, elapsed / 60)
    logger.info("  Files: %d generated, %d failed",
                gen_summary.get("ok", 0), gen_summary.get("failed", 0))
    logger.info("  Tokens: %d in, %d out",
                gen_summary.get("total_tokens_in", 0), gen_summary.get("total_tokens_out", 0))
    logger.info("  Validation: %d errors, %d warnings",
                len(report.errors), len(report.warnings))
    logger.info("  Questions: %d", len(questions))
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate eval corpus data for memory benchmarks.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  python generate.py dp_001                    # Generate dp_001
  python generate.py dp_001 dp_005             # Generate dp_001 through dp_005
  python generate.py dp_003 --resume           # Resume failed dp_003
  python generate.py dp_001 --questions-only   # Only generate questions
  python generate.py dp_002 --validate-only    # Only validate existing corpus
""",
    )
    parser.add_argument(
        "dp_start",
        help="Data point ID to generate (e.g., dp_001)",
    )
    parser.add_argument(
        "dp_end",
        nargs="?",
        default=None,
        help="End of range (inclusive). If omitted, only dp_start is generated.",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"LLM model to use (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=10,
        help="Max concurrent cluster workers (default: 10)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("output"),
        help="Base output directory (default: ./output)",
    )
    parser.add_argument(
        "--questions-only",
        action="store_true",
        help="Only generate questions for an existing corpus",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Only validate an existing corpus",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume a failed generation (skip already-generated files)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level (default: INFO)",
    )
    return parser.parse_args()


def get_dp_range(start: str, end: str | None) -> list[str]:
    """Return list of dp IDs from start to end (inclusive)."""
    all_dps = sorted(SCENARIOS.keys())
    if start not in all_dps:
        print(f"Error: unknown data point '{start}'. Available: {all_dps}")
        sys.exit(1)

    if end is None:
        return [start]

    if end not in all_dps:
        print(f"Error: unknown data point '{end}'. Available: {all_dps}")
        sys.exit(1)

    start_idx = all_dps.index(start)
    end_idx = all_dps.index(end)
    if end_idx < start_idx:
        print(f"Error: end '{end}' comes before start '{start}'")
        sys.exit(1)

    return all_dps[start_idx : end_idx + 1]


async def main() -> None:
    args = parse_args()

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )

    dp_ids = get_dp_range(args.dp_start, args.dp_end)
    logger.info("Will process: %s", ", ".join(dp_ids))

    for dp_id in dp_ids:
        try:
            await run_pipeline(
                dp_id,
                output_base=args.output_dir,
                model=args.model,
                max_concurrent=args.max_concurrent,
                questions_only=args.questions_only,
                validate_only=args.validate_only,
                resume=args.resume,
            )
        except Exception:
            logger.exception("Failed to process %s", dp_id)
            # Continue with next dp
            continue


if __name__ == "__main__":
    asyncio.run(main())
