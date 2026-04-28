# Eval Corpus Data Generator

Generates synthetic multi-file corpora for the SMFS memory eval benchmark. Each corpus simulates a real organization's shared memory — files written by many authors, in many formats, over a specific time period.

## Architecture

7-phase pipeline:

1. **Scenario Brief** — One LLM call creates the "bible" for the corpus (cast, timeline, locked facts, per-file briefs)
2. **Fact Registry** — Extracts every concrete fact into structured JSON (the single source of truth for consistency)
3. **File Manifest** — Describes every file to generate (path, format, author, locked facts, cross-references)
4. **Clustering** — Groups files into clusters of 3-8, topologically sorted so dependencies generate first
5. **File Generation** — Parallel workers generate files within clusters, passing cross-reference context
6. **Validation** — Audits token counts, locked facts, name consistency, cross-references
7. **Question Generation** — Creates 10 eval questions per corpus

## Setup

```bash
pip install -r requirements.txt
```

Requires a Gemini API key (or other LLM provider key) in the environment:

```bash
export GEMINI_API_KEY=your-key-here
# or
export OPENAI_API_KEY=your-key-here
export ANTHROPIC_API_KEY=your-key-here
```

## Usage

```bash
# Generate a single data point
python generate.py dp_001

# Generate a range
python generate.py dp_001 dp_005

# Resume a failed generation
python generate.py dp_003 --resume

# Generate only questions for an existing corpus
python generate.py dp_001 --questions-only

# Validate an existing corpus
python generate.py dp_002 --validate-only

# Use a specific model
python generate.py dp_001 --model openai/gpt-4o

# Set concurrency for large corpora
python generate.py dp_010 --max-concurrent 20

# Custom output directory
python generate.py dp_001 --output-dir /path/to/output
```

## Data Points

| dp | files | scenario |
|----|-------|----------|
| dp_001 | 5 | Two-person consulting kickoff |
| dp_002 | 10 | Couple's anniversary weekend trip |
| dp_003 | 20 | Single ER patient case across visits |
| dp_004 | 30 | Small-claims legal matter |
| dp_005 | 50 | Two-roommate co-living journal |
| dp_006 | 100 | Indie open-source project, 6 months |
| dp_007 | 200 | Grad-student lab, first semester |
| dp_008 | 300 | Pre-seed startup, first 6 months |
| dp_009 | 500 | Small therapy practice, 6 months |
| dp_010 | 1,000 | Growth-stage startup, 6 months |
| dp_011 | 2,000 | Newsroom investigation, 18 months |
| dp_012 | 5,000 | Embassy at one posting, 3-year archive |
| dp_013 | 10,000 | Tech-company CEO, full annual archive |

## Output Structure

```
output/dp_NNN/
├── SCENARIO.md           # Deep brief (world-building bible)
├── facts.json            # Structured fact registry
├── manifest.json         # File manifest with per-file briefs
├── data/                 # The actual corpus
│   ├── [domain folders]/
│   └── memory/
│       ├── profiles/
│       └── ...
├── question.json         # 10 eval questions
├── generation_log.json   # Audit trail (model, tokens, retries)
└── validation_report.json # Consistency audit results
```

## Testing

```bash
python -m pytest test_planner.py test_clusterer.py test_worker.py test_validator.py test_questions.py -v
```

## Design Decisions

- **Gemini 2.5 Pro** as default model (free tier, large context window)
- **Fact registry sharding** for large corpora: global facts (people, orgs) go to every worker; scoped facts (dates, financials) only go to workers that need them
- **Topological cluster ordering**: files that cross-reference each other are co-generated; dependency clusters generate first
- **30% overshoot tolerance** on token counts: slightly long is better than too short
- **Resume support**: every phase checks for existing output and skips if found
