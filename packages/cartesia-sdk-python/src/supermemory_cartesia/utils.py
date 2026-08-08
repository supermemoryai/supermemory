"""Utility functions for Supermemory Cartesia integration."""

from datetime import datetime, timezone
from typing import Any, Dict, List


def _get_result_field(result: Any, *keys: str) -> Any:
    """Read a field from a search result that may be a dict or an SDK model.

    The profile endpoint returns search results as plain dicts with camelCase
    keys, while the typed SDK models expose the same data as snake_case
    attributes. Accept both shapes so callers don't depend on the SDK version.
    """
    if isinstance(result, dict):
        for key in keys:
            value = result.get(key)
            if value is not None:
                return value
        return None
    for key in keys:
        value = getattr(result, key, None)
        if value is not None:
            return value
    return None


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
    search_results: List[Any],
) -> Dict[str, List[Any]]:
    """Deduplicate memories. Priority: static > dynamic > search.

    Args:
        static: List of static memory strings.
        dynamic: List of dynamic memory strings.
        search_results: List of search results with 'memory' and 'updatedAt',
            either as dicts or as SDK result models.
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
            memory = _get_result_field(r, "memory")
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
    memories: Dict[str, List[Any]],
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
            memory = _get_result_field(item, "memory") or ""
            updated_at = _get_result_field(item, "updatedAt", "updated_at") or ""
            time_str = format_relative_time(updated_at) if updated_at else ""
            if time_str:
                lines.append(f"- [{time_str}] {memory}")
            else:
                lines.append(f"- {memory}")
        sections.append("\n".join(lines))

    if not sections:
        return ""

    return f"{system_prompt}\n" + "\n\n".join(sections)
