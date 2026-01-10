"""Utility functions for Supermemory Pipecat integration."""

from typing import Dict, List


def get_last_user_message(messages: List[Dict[str, str]]) -> str | None:
    """Extract the last user message content from a list of messages."""
    for msg in reversed(messages):
        if msg["role"] == "user":
            return msg["content"]
    return None


def deduplicate_memories(
    static: List[str],
    dynamic: List[str],
    search_results: List[str],
) -> Dict[str, List[str]]:
    """Deduplicate memories. Priority: static > dynamic > search."""
    seen = set()

    def unique(memories):
        out = []
        for m in memories:
            if m not in seen:
                seen.add(m)
                out.append(m)
        return out

    return {
        "static": unique(static),
        "dynamic": unique(dynamic),
        "search_results": unique(search_results),
    }


def format_memories_to_text(
    memories: Dict[str, List[str]],
    system_prompt: str = "Based on previous conversations, I recall:\n\n",
    include_static: bool = True,
    include_dynamic: bool = True,
    include_search: bool = True,
) -> str:
    """Format deduplicated memories into a text string for injection."""
    sections = []

    static = memories["static"]
    dynamic = memories["dynamic"]
    search_results = memories["search_results"]

    if include_static and static:
        sections.append("## User Profile (Persistent)")
        sections.append("\n".join(f"- {item}" for item in static))

    if include_dynamic and dynamic:
        sections.append("## Recent Context")
        sections.append("\n".join(f"- {item}" for item in dynamic))

    if include_search and search_results:
        sections.append("## Relevant Memories")
        sections.append("\n".join(f"- {item}" for item in search_results))

    if not sections:
        return ""

    return f"{system_prompt}\n" + "\n\n".join(sections)
