import asyncio
import os
from agent_framework.openai import OpenAIResponsesClient
from supermemory_agent_framework import (
    AgentSupermemory,
    SupermemoryChatMiddleware,
    SupermemoryMiddlewareOptions,
    SupermemoryTools,
)


async def main():
    conn = AgentSupermemory(
        api_key=os.environ["SUPERMEMORY_API_KEY"],
        container_tag="test-user-123",
    )

    middleware = SupermemoryChatMiddleware(
        conn,
        options=SupermemoryMiddlewareOptions(
            mode="full",
            verbose=True,
            add_memory="always",
        ),
    )

    tools = SupermemoryTools(conn)

    agent = OpenAIResponsesClient(api_key=os.environ["OPENAI_API_KEY"], model_id="gpt-4o-mini").as_agent(
        name="MemoryAgent",
        instructions="You are a helpful assistant with memory.",
        middleware=[middleware],
        tools=tools.get_tools(),
    )

    print("Chat with the agent (type 'quit' to exit)")
    print("-" * 40)

    while True:
        try:
            user_input = input("\nYou: ")
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if user_input.strip().lower() in ("quit", "exit"):
            print("Bye!")
            break

        response = await agent.run(user_input)
        print(f"\nAgent: {response.text}")


asyncio.run(main())
