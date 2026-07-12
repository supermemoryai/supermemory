"""Utility functions for Supermemory Cartesia integration."""

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


def extract_search_result_fields(item: Any) -> tuple[str, str]:
    """Extract (memory, updatedAt) from a search result.

    The Supermemory SDK returns search results as pydantic models
    (attribute access, snake_case fields), while raw JSON payloads use
    dicts with camelCase keys — support both so results survive
    regardless of how they were fetched.
    """
    if isinstance(item, dict):
        memory = item.get("memory", "")
        updated_at = item.get("updatedAt", "")
    else:
        memory = getattr(item, "memory", None) or ""
        updated_at = getattr(item, "updated_at", None)
        if updated_at is None:
            updated_at = getattr(item, "updatedAt", "")

    if not isinstance(memory, str):
        memory = ""
    if isinstance(updated_at, datetime):
        updated_at = updated_at.isoformat()
    elif not isinstance(updated_at, str):
        updated_at = ""

    return memory, updated_at


def deduplicate_memories(
    static: List[str],
    dynamic: List[str],
    search_results: List[Any],
) -> Dict[str, Union[List[str], List[Any]]]:
    """Deduplicate memories. Priority: static > dynamic > search.

    Args:
        static: List of static memory strings.
        dynamic: List of dynamic memory strings.
        search_results: List of search results ('memory' and 'updatedAt'
            as dicts or SDK model objects).
    """
    seen = set()

    def unique_strings(memories: List[str]) -> List[str]:
        out = []
        for m in memories:
            if m not in seen:
                seen.add(m)
                out.append(m)
        return out

    def unique_search(results: List[Any]) -> List[Any]:
        out = []
        for r in results:
            memory, _ = extract_search_result_fields(r)
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
            if isinstance(item, str):
                lines.append(f"- {item}")
                continue
            memory, updated_at = extract_search_result_fields(item)
            time_str = format_relative_time(updated_at) if updated_at else ""
            if time_str:
                lines.append(f"- [{time_str}] {memory}")
            else:
                lines.append(f"- {memory}")
        sections.append("\n".join(lines))

    if not sections:
        return ""

    return f"{system_prompt}\n" + "\n\n".join(sections)
