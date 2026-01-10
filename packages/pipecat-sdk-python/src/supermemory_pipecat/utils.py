"""Utility functions for Supermemory Pipecat integration."""

from typing import Any, Dict, List, Optional


def get_last_user_message(messages: List[Dict[str, Any]]) -> Optional[str]:
    """
    Extract the last user message from a list of messages.

    Args:
        messages: List of message dictionaries with 'role' and 'content' keys

    Returns:
        The content of the last user message, or None if not found
    """
    for message in reversed(messages):
        if message.get("role") == "user":
            content = message.get("content", "")
            if isinstance(content, str):
                return content
            elif isinstance(content, list):
                # Handle content that is an array of content parts
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                    elif isinstance(part, str):
                        text_parts.append(part)
                return " ".join(text_parts)
    return None


def deduplicate_memories(
    static: Optional[List[Any]] = None,
    dynamic: Optional[List[Any]] = None,
    search_results: Optional[List[Any]] = None,
) -> Dict[str, List[str]]:
    """
    Deduplicates memory items across sources.
    Priority: Static > Dynamic > Search Results.

    Args:
        static: List of static profile memories
        dynamic: List of dynamic profile memories
        search_results: List of search result memories

    Returns:
        Dictionary with deduplicated 'static', 'dynamic', and 'search_results' lists
    """
    static_items = static or []
    dynamic_items = dynamic or []
    search_items = search_results or []

    def extract_memory_text(item: Any) -> Optional[str]:
        if isinstance(item, dict):
            item = item.get("memory")
        if isinstance(item, str):
            trimmed = item.strip()
            return trimmed or None
        return None

    static_memories: List[str] = []
    seen_memories: set = set()

    for item in static_items:
        memory = extract_memory_text(item)
        if memory is not None:
            static_memories.append(memory)
            seen_memories.add(memory)

    dynamic_memories: List[str] = []
    for item in dynamic_items:
        memory = extract_memory_text(item)
        if memory is not None and memory not in seen_memories:
            dynamic_memories.append(memory)
            seen_memories.add(memory)

    search_memories: List[str] = []
    for item in search_items:
        memory = extract_memory_text(item)
        if memory is not None and memory not in seen_memories:
            search_memories.append(memory)
            seen_memories.add(memory)

    return {
        "static": static_memories,
        "dynamic": dynamic_memories,
        "search_results": search_memories,
    }


def format_memories_to_text(
    memories: Dict[str, List[str]],
    system_prompt: str = "Based on previous conversations, I recall:\n\n",
    include_static: bool = True,
    include_dynamic: bool = True,
    include_search: bool = True,
) -> str:
    """
    Format deduplicated memories into a text string for injection.

    Args:
        memories: Dictionary with 'static', 'dynamic', 'search_results' lists
        system_prompt: Prefix text for the memory content
        include_static: Whether to include static profile memories
        include_dynamic: Whether to include dynamic profile memories
        include_search: Whether to include search result memories

    Returns:
        Formatted memory text string
    """
    sections = []

    static = memories.get("static", [])
    dynamic = memories.get("dynamic", [])
    search_results = memories.get("search_results", [])

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
