"""Agent subclass that recalls memory before each reply."""

from typing import Any

from livekit.agents import Agent, llm

from .memory import SupermemoryLiveKit


class SupermemoryAgent(Agent):
    """LiveKit agent that injects Supermemory before each reply.

    Recall runs in ``llm_node``, so voice and text turns both get memory and
    LiveKit's preemptive generation is kept. Realtime models skip ``llm_node``,
    so for those it runs in ``on_user_turn_completed``.

    Pass any extra tools through ``tools``. Memory tools are added for you.
    Override ``llm_node`` or ``on_user_turn_completed`` and call ``super()`` if you
    also need those hooks.
    """

    def __init__(self, memory: SupermemoryLiveKit, **kwargs: Any) -> None:
        tools = list(kwargs.pop("tools", None) or [])
        tools.extend(memory.tools())
        super().__init__(tools=tools, **kwargs)
        self.memory = memory

    async def on_user_turn_completed(self, turn_ctx: Any, new_message: Any) -> None:
        if self._uses_realtime_model():
            await self.memory.on_user_turn_completed(turn_ctx, new_message)

    async def llm_node(self, chat_ctx: Any, tools: list[Any], model_settings: Any) -> Any:
        await self.memory.enrich(chat_ctx)
        return Agent.default.llm_node(self, chat_ctx, tools, model_settings)

    def _uses_realtime_model(self) -> bool:
        model = self.llm
        if not isinstance(model, (llm.LLM, llm.RealtimeModel)):
            try:
                model = self.session.llm
            except RuntimeError:
                return False
        return isinstance(model, llm.RealtimeModel)
