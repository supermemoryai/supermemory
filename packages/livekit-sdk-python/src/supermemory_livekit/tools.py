"""LiveKit function tools bound to one memory scope."""

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .memory import SupermemoryLiveKit


def build_tools(memory: "SupermemoryLiveKit") -> list[Any]:
    from livekit.agents import RunContext, function_tool

    @function_tool()
    async def search_memories(context: RunContext, query: str) -> str:
        """Search long-term memory for facts, preferences, and past calls.

        Args:
            query: What to look up, using the caller's words, names, or topic.
        """
        del context
        return await memory.search(query)

    @function_tool()
    async def remember(context: RunContext, fact: str) -> str:
        """Save one durable fact the caller asked you to remember.

        Args:
            fact: A single sentence fact, preference, decision, or correction.
        """
        del context
        return await memory.remember(fact)

    @function_tool()
    async def forget(context: RunContext, memory_id: str = "", fact: str = "") -> str:
        """Forget one learned fact. Pass a memory id from search_memories, or the exact text.

        Args:
            memory_id: Id from a search_memories result. Leave empty to match text instead.
            fact: Exact memory text to forget when you do not have an id.
        """
        del context
        return await memory.forget(memory_id=memory_id, memory_text=fact)

    return [search_memories, remember, forget]
