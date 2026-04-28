"""Prompt templates for Phase 2: Fact Registry extraction."""

FACT_REGISTRY_SYSTEM = """\
You are a precise data extractor. Your job is to read a scenario brief (SCENARIO.md)
and extract every concrete, verifiable fact into a structured JSON registry.

This registry is the single source of truth for corpus consistency. Every worker
generating files will receive this registry and must use these exact values.

Be exhaustive. If a fact appears in the brief, it must be in the registry.
If a fact could be referenced by multiple files, tag all of them.
"""

FACT_REGISTRY_PROMPT = """\
## Task

Extract a structured fact registry from the following scenario brief.

## Input: SCENARIO.md

{scenario_brief}

## Output: JSON

Return a JSON object with this exact structure:

```json
{{
  "scenario_id": "dp_NNN",
  "people": [
    {{
      "id": "person_slug",
      "full_name": "Full Name",
      "role": "Title, Organization",
      "email": "email@example.com",
      "timezone": "America/New_York",
      "location": "City, State/Country",
      "traits": ["trait1", "trait2"],
      "writing_style": "Description of how they write",
      "relationships": {{"person_slug2": "relationship description"}}
    }}
  ],
  "organizations": [
    {{
      "id": "org_slug",
      "name": "Full Org Name",
      "type": "company/hospital/embassy/etc",
      "location": "City, State/Country",
      "details": {{"key": "value"}}
    }}
  ],
  "dates": [
    {{
      "id": "date_slug",
      "date": "YYYY-MM-DD",
      "time": "HH:MM TZ (if applicable)",
      "event": "What happened",
      "participants": ["person_slug1", "person_slug2"],
      "files": ["f001", "f002"]
    }}
  ],
  "financial": [
    {{
      "id": "financial_slug",
      "value": "$X,XXX.XX",
      "description": "What this amount represents",
      "files": ["f001", "f003"]
    }}
  ],
  "references": [
    {{
      "id": "ref_slug",
      "value": "EXACT-REF-CODE",
      "type": "booking/case_number/mrn/confirmation/docket",
      "description": "What this reference identifies",
      "files": ["f002", "f004"]
    }}
  ],
  "locations": [
    {{
      "id": "location_slug",
      "name": "Place Name",
      "address": "Full address if known",
      "type": "restaurant/hotel/office/hospital/etc",
      "details": {{"key": "value"}},
      "files": ["f001", "f005"]
    }}
  ],
  "domain_facts": [
    {{
      "id": "domain_slug",
      "category": "medical/legal/technical/etc",
      "fact": "The exact fact",
      "files": ["f003", "f007"]
    }}
  ],
  "cross_references": [
    {{
      "source_file": "f001",
      "target_file": "f002",
      "fact_ids": ["financial_slug1", "date_slug2"],
      "description": "How these files reference each other"
    }}
  ]
}}
```

Rules:
- Every ID must be a unique, URL-safe slug (lowercase, underscores)
- Dollar amounts must include exact cents when relevant
- Dates must be ISO 8601 (YYYY-MM-DD)
- The "files" arrays must reference file_ids from the manifest (f001, f002, etc.)
- Include ALL facts, even minor ones — completeness is critical
- Do not invent facts not in the brief
"""


def format_fact_registry_prompt(scenario_brief: str) -> str:
    """Format the fact registry extraction prompt."""
    return FACT_REGISTRY_PROMPT.format(scenario_brief=scenario_brief)
