"""Agent subclass that recalls memory before each reply."""

from typing import Any

from livekit.agents import Agent

from .memory import SupermemoryLiveKit


class SupermemoryAgent(Agent):
    """LiveKit agent that injects Supermemory before each user turn.

    Pass any extra tools through ``tools``. Memory tools are added for you.
    Override ``on_user_turn_completed`` and call ``super()`` if you also need
    the hook.
    """

    def __init__(self, memory: SupermemoryLiveKit, **kwargs: Any) -> None:
        tools = list(kwargs.pop("tools", None) or [])
        tools.extend(memory.tools())
        super().__init__(tools=tools, **kwargs)
        self.memory = memory

    async def on_user_turn_completed(self, turn_ctx: Any, new_message: Any) -> None:
        await self.memory.on_user_turn_completed(turn_ctx, new_message)

    async def llm_node(self, chat_ctx: Any, tools: list[Any], model_settings: Any) -> Any:
        await self.memory.enrich(chat_ctx)
        return Agent.default.llm_node(self, chat_ctx, tools, model_settings)
