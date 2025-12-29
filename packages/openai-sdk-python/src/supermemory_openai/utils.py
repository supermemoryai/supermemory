"""Utility functions for Supermemory OpenAI middleware."""

import json
from typing import Optional, Any, Protocol

from openai.types.chat import ChatCompletionMessageParam


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

        log_message = f"[supermemory] {message}"
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


def get_last_user_message(
    messages: list[ChatCompletionMessageParam],
) -> str:
    """
    Extract the last user message from an array of chat completion messages.

    Searches through the messages array in reverse order to find the most recent
    message with role "user" and returns its content as a string.

    Args:
        messages: Array of chat completion message parameters

    Returns:
        The content of the last user message, or empty string if none found

    Example:
        ```python
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello there!"},
            {"role": "assistant", "content": "Hi! How can I help you?"},
            {"role": "user", "content": "What's the weather like?"}
        ]

        last_message = get_last_user_message(messages)
        # Returns: "What's the weather like?"
        ```
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
    return ""


def get_conversation_content(
    messages: list[ChatCompletionMessageParam],
) -> str:
    """
    Convert an array of chat completion messages into a formatted conversation string.

    Transforms the messages array into a readable conversation format where each
    message is prefixed with its role (User/Assistant) and messages are separated
    by double newlines.

    Args:
        messages: Array of chat completion message parameters

    Returns:
        Formatted conversation string with role prefixes

    Example:
        ```python
        messages = [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi there!"},
            {"role": "user", "content": "How are you?"}
        ]

        conversation = get_conversation_content(messages)
        # Returns: "User: Hello!\n\nAssistant: Hi there!\n\nUser: How are you?"
        ```
    """
    conversation_parts = []

    for message in messages:
        role = message.get("role", "")
        content = message.get("content", "")

        # Format role
        if role == "user":
            role_display = "User"
        elif role == "assistant":
            role_display = "Assistant"
        elif role == "system":
            role_display = "System"
        else:
            role_display = role.capitalize()

        # Extract content text
        if isinstance(content, str):
            content_text = content
        elif isinstance(content, list):
            # Handle content that is an array of content parts
            text_parts = []
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_parts.append(part.get("text", ""))
                elif isinstance(part, str):
                    text_parts.append(part)
            content_text = " ".join(text_parts)
        else:
            content_text = str(content)

        if content_text:
            conversation_parts.append(f"{role_display}: {content_text}")

    return "\n\n".join(conversation_parts)


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
    """
    Deduplicates memory items across sources. Priority: Static > Dynamic > Search Results.
    Same memory appearing in multiple sources is kept only in the highest-priority source.
    """
    static_items = static or []
    dynamic_items = dynamic or []
    search_items = search_results or []

    def extract_memory_text(item: Any) -> Optional[str]:
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

    for item in static_items:
        memory = extract_memory_text(item)
        if memory is not None:
            static_memories.append(memory)
            seen_memories.add(memory)

    dynamic_memories: list[str] = []
    for item in dynamic_items:
        memory = extract_memory_text(item)
        if memory is not None and memory not in seen_memories:
            dynamic_memories.append(memory)
            seen_memories.add(memory)

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


def convert_profile_to_markdown(data: dict[str, Any]) -> str:
    """
    Convert profile data to markdown based on profile.static and profile.dynamic properties.

    Args:
        data: Profile structure data

    Returns:
        Markdown string

    Example:
        ```python
        data = {
            "profile": {
                "static": ["User prefers Python", "Lives in San Francisco"],
                "dynamic": ["Recently asked about AI"]
            },
            "searchResults": {
                "results": [{"memory": "Likes coffee"}]
            }
        }

        markdown = convert_profile_to_markdown(data)
        # Returns formatted markdown with sections
        ```
    """
    sections = []

    profile = data.get("profile", {})
    static_memories = profile.get("static", [])
    dynamic_memories = profile.get("dynamic", [])

    if static_memories:
        sections.append("## Static Profile")
        sections.append("\n".join(f"- {item}" for item in static_memories))

    if dynamic_memories:
        sections.append("## Dynamic Profile")
        sections.append("\n".join(f"- {item}" for item in dynamic_memories))

    return "\n\n".join(sections)
