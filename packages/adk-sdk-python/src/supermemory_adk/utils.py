"""Utility functions for Supermemory ADK integration."""

import json
from typing import Any, Optional, Protocol


class Logger(Protocol):
    """Logger protocol for type safety."""

    def debug(self, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log debug message."""
        ...

    def info(self, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log info message."""
        ...

    def warn(self, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log warning message."""
        ...

    def error(self, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log error message."""
        ...


class SimpleLogger:
    """Simple logger implementation."""

    def __init__(self, verbose: bool = False):
        self.verbose: bool = verbose

    def _log(self, level: str, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Internal logging method."""
        if not self.verbose:
            return

        log_message = f"[supermemory-adk] {message}"
        if data:
            log_message += f" {json.dumps(data, indent=2)}"

        if level == "error":
            print(f"ERROR: {log_message}", flush=True)
        elif level == "warn":
            print(f"WARN: {log_message}", flush=True)
        else:
            print(log_message, flush=True)

    def debug(self, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log debug message."""
        self._log("debug", message, data)

    def info(self, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log info message."""
        self._log("info", message, data)

    def warn(self, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log warning message."""
        self._log("warn", message, data)

    def error(self, message: str, data: Optional[dict[str, Any]] = None) -> None:
        """Log error message."""
        self._log("error", message, data)


def create_logger(verbose: bool) -> Logger:
    """Create a logger instance.

    Args:
        verbose: Whether to enable verbose logging

    Returns:
        Logger instance
    """
    return SimpleLogger(verbose)


class DeduplicatedMemories:
    """Deduplicated memory strings organized by source."""

    def __init__(self, static: list[str], dynamic: list[str], search_results: list[str]):
        self.static = static
        self.dynamic = dynamic
        self.search_results = search_results


def deduplicate_memories(
    static: Optional[list[Any]] = None,
    dynamic: Optional[list[Any]] = None,
    search_results: Optional[list[Any]] = None,
) -> DeduplicatedMemories:
    """Deduplicate memory items across sources.

    Priority: Static > Dynamic > Search Results.
    Same memory appearing in multiple sources is kept only in the highest-priority source.

    Args:
        static: Static profile memories
        dynamic: Dynamic profile memories
        search_results: Search result memories

    Returns:
        DeduplicatedMemories with deduplicated lists
    """
    static_items = static or []
    dynamic_items = dynamic or []
    search_items = search_results or []

    def extract_memory_text(item: Any) -> Optional[str]:
        """Extract memory text from various formats."""
        if item is None:
            return None
        if isinstance(item, dict):
            memory = item.get("memory")
            if isinstance(memory, str):
                trimmed = memory.strip()
                return trimmed if trimmed else None
            return None
        if isinstance(item, str):
            trimmed = item.strip()
            return trimmed if trimmed else None
        return None

    static_memories: list[str] = []
    seen_memories: set[str] = set()

    # Add static memories first
    for item in static_items:
        memory = extract_memory_text(item)
        if memory is not None:
            static_memories.append(memory)
            seen_memories.add(memory)

    # Add dynamic memories (skip duplicates)
    dynamic_memories: list[str] = []
    for item in dynamic_items:
        memory = extract_memory_text(item)
        if memory is not None and memory not in seen_memories:
            dynamic_memories.append(memory)
            seen_memories.add(memory)

    # Add search results (skip duplicates)
    search_memories: list[str] = []
    for item in search_items:
        memory = extract_memory_text(item)
        if memory is not None and memory not in seen_memories:
            search_memories.append(memory)
            seen_memories.add(memory)

    return DeduplicatedMemories(
        static=static_memories,
        dynamic=dynamic_memories,
        search_results=search_memories,
    )


def format_memories_to_markdown(
    memories: DeduplicatedMemories,
    include_static: bool = True,
    include_dynamic: bool = True,
    include_search: bool = True,
) -> str:
    """Format deduplicated memories into markdown.

    Args:
        memories: Deduplicated memories
        include_static: Whether to include static profile memories
        include_dynamic: Whether to include dynamic profile memories
        include_search: Whether to include search result memories

    Returns:
        Markdown formatted string

    Example:
        ```python
        memories = DeduplicatedMemories(
            static=["User prefers Python"],
            dynamic=["Recently asked about AI"],
            search_results=["Likes coffee"]
        )

        markdown = format_memories_to_markdown(memories)
        # Returns formatted markdown with sections
        ```
    """
    sections = []

    if include_static and memories.static:
        sections.append("## User Profile (Persistent)")
        sections.append("\n".join(f"- {item}" for item in memories.static))

    if include_dynamic and memories.dynamic:
        sections.append("## Recent Context")
        sections.append("\n".join(f"- {item}" for item in memories.dynamic))

    if include_search and memories.search_results:
        sections.append("## Relevant Memories")
        sections.append("\n".join(f"- {item}" for item in memories.search_results))

    if not sections:
        return ""

    return "\n\n".join(sections)


def format_memories_to_text(
    memories: DeduplicatedMemories,
    system_prompt: str = "Based on previous conversations, I recall:\n\n",
    include_static: bool = True,
    include_dynamic: bool = True,
    include_search: bool = True,
) -> str:
    """Format deduplicated memories into text with system prompt.

    Args:
        memories: Deduplicated memories
        system_prompt: Prefix text for memory context
        include_static: Whether to include static profile memories
        include_dynamic: Whether to include dynamic profile memories
        include_search: Whether to include search result memories

    Returns:
        Formatted text string with system prompt prefix
    """
    markdown = format_memories_to_markdown(
        memories,
        include_static=include_static,
        include_dynamic=include_dynamic,
        include_search=include_search,
    )

    if not markdown:
        return ""

    return f"{system_prompt}{markdown}"
