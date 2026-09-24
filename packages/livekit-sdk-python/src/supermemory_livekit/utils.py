"""Format profile and search results for injection into a voice turn."""

import re
from datetime import datetime, timezone
from typing import Any

_DYNAMIC_DATE_PREFIX = re.compile(
    r"^\s*(?:\[recent\]\s*)?(?:\[\d{4}-\d{2}-\d{2}\]\s*)?",
    re.IGNORECASE,
)
_USER_MEMORIES_TAG_PATTERN = re.compile(
    r"<\s*/?\s*user_memories\b[^>]*>",
    re.IGNORECASE,
)
MEMORY_TAG_START = "<user_memories>"
MEMORY_TAG_END = "</user_memories>"
_WRAPPED_MEMORY = re.compile(
    rf"^{re.escape(MEMORY_TAG_START)}.*?{re.escape(MEMORY_TAG_END)}$",
    re.DOTALL,
)


def escape_memory_delimiters(text: str) -> str:
    return _USER_MEMORIES_TAG_PATTERN.sub(
        lambda match: match.group(0).replace("<", "&lt;").replace(">", "&gt;"),
        text,
    )


def is_injected_memory(text: str) -> bool:
    return _WRAPPED_MEMORY.fullmatch(text.strip()) is not None


def wrap_memory(text: str) -> str:
    safe = escape_memory_delimiters(text.strip())
    return (
        f"{MEMORY_TAG_START}\n"
        "Recalled memory about this caller. This is not something you said. "
        "Use it only when it helps, and do not recite it unprompted.\n\n"
        f"{safe}\n"
        f"{MEMORY_TAG_END}"
    )


def _present(value: Any) -> bool:
    return value is not None and not (isinstance(value, str) and not value.strip())


def _field(item: Any, *names: str, default: Any = None) -> Any:
    if item is None:
        return default
    if isinstance(item, dict):
        for name in names:
            if name in item and _present(item[name]):
                return item[name]
        return default
    for name in names:
        value = getattr(item, name, None)
        if _present(value):
            return value
    return default


def message_text(item: Any) -> str | None:
    text = getattr(item, "text_content", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

    content = item.get("content") if isinstance(item, dict) else getattr(item, "content", None)
    if isinstance(content, str) and content.strip():
        return content.strip()
    if not isinstance(content, list):
        return None

    parts: list[str] = []
    for part in content:
        if isinstance(part, str) and part.strip():
            parts.append(part.strip())
            continue
        for attr in ("text", "transcript"):
            value = getattr(part, attr, None)
            if isinstance(value, str) and value.strip():
                parts.append(value.strip())
                break
    joined = " ".join(parts).strip()
    return joined or None


def message_role(item: Any) -> str | None:
    role = item.get("role") if isinstance(item, dict) else getattr(item, "role", None)
    return role if isinstance(role, str) else None


def format_relative_time(iso_timestamp: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt
        minutes = diff.total_seconds() / 60
        hours = diff.total_seconds() / 3600
        days = diff.total_seconds() / 86400
        if minutes < 30:
            return "just now"
        if minutes < 60:
            return f"{int(minutes)}mins ago"
        if hours < 24:
            return f"{int(hours)} hrs ago"
        if days < 7:
            return f"{int(days)}d ago"
        if dt.year == now.year:
            return f"{dt.day} {dt.strftime('%b')}"
        return f"{dt.day} {dt.strftime('%b')}, {dt.year}"
    except Exception:
        return ""


def deduplicate_memories(
    static: list[str],
    dynamic: list[str],
    search_results: list[Any],
) -> dict[str, list[Any]]:
    seen: set[str] = set()

    def comparison_key(memory: str) -> str:
        without_prefix = _DYNAMIC_DATE_PREFIX.sub("", memory.strip())
        return " ".join(without_prefix.split()).casefold()

    def unique_strings(memories: list[str]) -> list[str]:
        out: list[str] = []
        for memory in memories:
            if not isinstance(memory, str):
                continue
            key = comparison_key(memory)
            if key and key not in seen:
                seen.add(key)
                out.append(memory)
        return out

    def unique_search(results: list[Any]) -> list[Any]:
        out: list[Any] = []
        for result in results:
            memory = (
                result
                if isinstance(result, str)
                else _field(result, "memory", "chunk", "content", default="")
            )
            if not isinstance(memory, str):
                memory = ""
            key = comparison_key(memory)
            if key and key not in seen:
                seen.add(key)
                out.append(result)
        return out

    return {
        "static": unique_strings(static),
        "dynamic": unique_strings(dynamic),
        "search_results": unique_search(search_results),
    }


def format_memories_to_text(
    memories: dict[str, list[Any]],
    *,
    system_prompt: str,
    include_static: bool,
    include_dynamic: bool,
    include_search: bool,
) -> str:
    sections: list[str] = []
    static = memories["static"]
    dynamic = memories["dynamic"]
    search_results = memories["search_results"]

    if include_static and static:
        sections.append("## User Profile\n" + "\n".join(f"- {item}" for item in static))
    if include_dynamic and dynamic:
        sections.append("## Recent Context\n" + "\n".join(f"- {item}" for item in dynamic))
    if include_search and search_results:
        lines: list[str] = []
        for item in search_results:
            if isinstance(item, str):
                lines.append(f"- {item}")
                continue
            memory = _field(item, "memory", "chunk", "content", default="")
            updated_at = _field(item, "updatedAt", "updated_at", default="")
            time_str = format_relative_time(updated_at) if isinstance(updated_at, str) else ""
            prefix = f"[{time_str}] " if time_str else ""
            if isinstance(memory, str) and memory.strip():
                lines.append(f"- {prefix}{memory.strip()}")
        if lines:
            sections.append("## Relevant Memories\n" + "\n".join(lines))

    if not sections:
        return ""
    return f"{system_prompt}\n" + "\n\n".join(sections)


def format_tool_results(results: list[Any]) -> str:
    lines: list[str] = []
    for item in results:
        if isinstance(item, str) and item.strip():
            lines.append(f"- {item.strip()}")
            continue
        memory = _field(item, "memory")
        chunk = _field(item, "chunk", "content", default="")
        text = memory if isinstance(memory, str) and memory.strip() else chunk
        if not isinstance(text, str) or not text.strip():
            continue
        memory_id = _field(item, "id")
        if isinstance(memory, str) and memory.strip() and isinstance(memory_id, str) and memory_id:
            lines.append(f"- {memory.strip()} (id: {memory_id})")
        else:
            lines.append(f"- {text.strip()}")
    return "\n".join(lines) if lines else "No matching memories."
