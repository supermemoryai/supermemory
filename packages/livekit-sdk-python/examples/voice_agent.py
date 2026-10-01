"""Voice agent that remembers each caller across calls.

Run from this folder after filling in .env (see README.md):

    python voice_agent.py console   # talk through your mic in the terminal
    python voice_agent.py dev       # join LiveKit rooms, e.g. from the Agents Playground
"""

import json
import logging
import os

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, AgentSession, ChatContext, JobContext
from supermemory_livekit import SupermemoryAgent, SupermemoryLiveKit

load_dotenv()
logger = logging.getLogger("voice-agent")

INSTRUCTIONS = (
    "You are a friendly voice assistant. You remember this caller across calls. "
    "Use what you know naturally, and do not mention the memory system. "
    "When the caller asks you to remember something, call remember. Keep replies short."
)

server = AgentServer()


# An agent_name turns on explicit dispatch, which is how job metadata reaches the agent.
# Leave it empty to join every new room, which the Agents Playground needs.
@server.rtc_session(agent_name=os.getenv("LIVEKIT_AGENT_NAME", ""))
async def entrypoint(ctx: JobContext):
    memory = SupermemoryLiveKit(api_key=os.environ["SUPERMEMORY_API_KEY"])

    # Your backend can pass the caller id in dispatch metadata. SUPERMEMORY_CONTAINER_TAG
    # pins every call to one caller while testing. Console mode has no remote participant.
    metadata = json.loads(ctx.job.metadata or "{}")
    container_tag = metadata.get("container_tag") or os.getenv("SUPERMEMORY_CONTAINER_TAG")
    if not container_tag and ctx.is_fake_job():
        container_tag = "console_user"

    await ctx.connect()
    if container_tag:
        memory.bind(container_tag=container_tag, session_id=ctx.room.name)
    else:
        participant = await ctx.wait_for_participant()
        memory.bind(participant=participant, session_id=ctx.room.name)
    logger.info("memory scoped to container tag %s", memory.container_tag)

    # The caller's profile goes into the first turn, so the greeting can use it.
    chat_ctx = ChatContext()
    await memory.preload(chat_ctx)

    session = AgentSession(
        stt="deepgram/nova-3:en",
        llm="openai/gpt-4.1-mini",
        tts="cartesia/sonic-3",
    )
    memory.attach(session)
    await session.start(
        room=ctx.room,
        agent=SupermemoryAgent(memory, chat_ctx=chat_ctx, instructions=INSTRUCTIONS),
    )
    await session.generate_reply(
        instructions="Greet the caller. If you already know them, welcome them back by name."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
