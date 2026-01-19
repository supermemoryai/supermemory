"""Utility functions for Supermemory Pipecat integration."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Union


def get_last_user_message(messages: List[Dict[str, str]]) -> str | None:
    """Extract the last user message content from a list of messages."""
    for msg in reversed(messages):
        if msg["role"] == "user":
            return msg["content"]
    return None


def format_relative_time(iso_timestamp: str) -> str:
    """Convert ISO timestamp to relative time string.

    Format rules:
    - [just now] - within 30 minutes
    - [Xmins ago] - 30-60 minutes
    - [X hrs ago] - less than 1 day
    - [Xd ago] - less than 1 week
    - [X Jul] - more than 1 week, same year
    - [X Jul, 2023] - different year
    """
    try:
        dt = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt

        seconds = diff.total_seconds()
        minutes = seconds / 60
        hours = seconds / 3600
        days = seconds / 86400

        if minutes < 30:
            return "just now"
        elif minutes < 60:
            return f"{int(minutes)}mins ago"
        elif hours < 24:
            return f"{int(hours)} hrs ago"
        elif days < 7:
            return f"{int(days)}d ago"
        elif dt.year == now.year:
            return f"{dt.day} {dt.strftime('%b')}"
        else:
            return f"{dt.day} {dt.strftime('%b')}, {dt.year}"
    except Exception:
        return ""


def deduplicate_memories(
    static: List[str],
    dynamic: List[str],
    search_results: List[Dict[str, Any]],
) -> Dict[str, Union[List[str], List[Dict[str, Any]]]]:
    """Deduplicate memories. Priority: static > dynamic > search.

    Args:
        static: List of static memory strings.
        dynamic: List of dynamic memory strings.
        search_results: List of search result dicts with 'memory' and 'updatedAt'.
    """
    seen = set()

    def unique_strings(memories: List[str]) -> List[str]:
        out = []
        for m in memories:
            if m not in seen:
                seen.add(m)
                out.append(m)
        return out

    def unique_search(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out = []
        for r in results:
            memory = r.get("memory", "")
            if memory and memory not in seen:
                seen.add(memory)
                out.append(r)
        return out

    return {
        "static": unique_strings(static),
        "dynamic": unique_strings(dynamic),
        "search_results": unique_search(search_results),
    }


def format_memories_to_text(
    memories: Dict[str, Union[List[str], List[Dict[str, Any]]]],
    system_prompt: str = "Based on previous conversations, I recall:\n\n",
    include_static: bool = True,
    include_dynamic: bool = True,
    include_search: bool = True,
) -> str:
    """Format deduplicated memories into a text string for injection.

    Search results include temporal context (e.g., '3d ago') from updatedAt.
    """
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
        lines = []
        for item in search_results:
            if isinstance(item, dict):
                memory = item.get("memory", "")
                updated_at = item.get("updatedAt", "")
                time_str = format_relative_time(updated_at) if updated_at else ""
                if time_str:
                    lines.append(f"- [{time_str}] {memory}")
                else:
                    lines.append(f"- {memory}")
            else:
                lines.append(f"- {item}")
        sections.append("\n".join(lines))

    if not sections:
        return ""

    return f"{system_prompt}\n" + "\n\n".join(sections)
