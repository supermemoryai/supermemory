"""Utility functions for message processing and memory formatting."""

from typing import List, Optional
from openai.types.chat import ChatCompletionMessageParam

from .memory_client import ProfileStructure


def convert_profile_to_markdown(data: ProfileStructure) -> str:
    """Convert ProfileStructure to markdown format.

    Args:
        data: ProfileStructure from memory client

    Returns:
        Formatted markdown string
    """
    sections: List[str] = []

    profile = data.get("profile", {})

    if profile.get("static") and len(profile["static"]) > 0:
        sections.append("## Static Profile")
        sections.append("\n".join([f"- {item}" for item in profile["static"]]))

    if profile.get("dynamic") and len(profile["dynamic"]) > 0:
        sections.append("## Dynamic Profile")
        sections.append("\n".join([f"- {item}" for item in profile["dynamic"]]))

    return "\n\n".join(sections)


def get_last_user_message(messages: List[ChatCompletionMessageParam]) -> Optional[str]:
    """Extract the last user message content from a list of messages.

    Args:
        messages: List of chat completion messages

    Returns:
        Content of the last user message, or None if not found
    """
    # Find the last user message by iterating in reverse
    for message in reversed(messages):
        if message.get("role") == "user":
            content = message.get("content")
            if isinstance(content, str):
                return content
            elif isinstance(content, list):
                # Extract text content from content parts
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                return " ".join(text_parts)

    return None


def get_conversation_content(messages: List[ChatCompletionMessageParam]) -> str:
    """Convert conversation messages to a formatted string.

    Args:
        messages: List of chat completion messages

    Returns:
        Formatted conversation content
    """
    conversation_parts = []

    for message in messages:
        role = message.get("role", "")
        role_label = {
            "user": "User",
            "assistant": "Assistant",
            "system": "System",
            "tool": "Tool"
        }.get(role, "Unknown")

        content = message.get("content")
        if isinstance(content, str):
            conversation_parts.append(f"{role_label}: {content}")
        elif isinstance(content, list):
            # Extract text content from content parts
            text_parts = []
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_parts.append(part.get("text", ""))
            if text_parts:
                conversation_parts.append(f"{role_label}: {' '.join(text_parts)}")

    return "\n\n".join(conversation_parts)


def inject_memories_into_messages(
    messages: List[ChatCompletionMessageParam],
    memories: str,
) -> List[ChatCompletionMessageParam]:
    """Inject memory content into the messages list.

    If a system message exists, append memories to it.
    Otherwise, create a new system message with the memories.

    Args:
        messages: Original list of messages
        memories: Memory content to inject

    Returns:
        Updated list of messages with memories injected
    """
    if not memories.strip():
        return messages

    # Check if system message exists
    has_system_message = any(msg.get("role") == "system" for msg in messages)

    if has_system_message:
        # Append to existing system message
        updated_messages = []
        for message in messages:
            if message.get("role") == "system":
                content = message.get("content", "")
                if isinstance(content, str):
                    updated_content = f"{content}\n\n{memories}"
                elif isinstance(content, list):
                    # Handle multimodal content - append text to existing text parts or add new text part
                    updated_content = list(content)  # Copy the list
                    # Add memories as a new text part
                    updated_content.append({"type": "text", "text": f"\n\n{memories}"})
                else:
                    # Fallback: convert to string and append
                    updated_content = f"{content}\n\n{memories}"

                updated_message = dict(message)
                updated_message["content"] = updated_content
                updated_messages.append(updated_message)
            else:
                updated_messages.append(message)
        return updated_messages
    else:
        # Create new system message
        system_message: ChatCompletionMessageParam = {
            "role": "system",
            "content": memories,
        }
        return [system_message] + list(messages)


def format_search_results(profile_data: ProfileStructure, mode: str) -> str:
    """Format profile data and search results based on mode.

    Args:
        profile_data: ProfileStructure from memory client
        mode: Memory search mode ("profile", "query", or "full")

    Returns:
        Formatted memory content string
    """
    memory_parts = []

    # Add profile data for non-query modes
    if mode != "query":
        profile_markdown = convert_profile_to_markdown(profile_data)
        if profile_markdown:
            memory_parts.append(profile_markdown)

    # Add search results for non-profile modes
    if mode != "profile":
        search_results = profile_data.get("searchResults", {}).get("results", [])
        if search_results:
            search_content = "Search results for user's recent message:\n" + "\n".join(
                [f"- {result.get('memory', '')}" for result in search_results]
            )
            memory_parts.append(search_content)

    return "\n\n".join(memory_parts)
