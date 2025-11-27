from supermemory import Supermemory

client = Supermemory()
USER_ID = "dhravya"

conversation = [
    {"role": "assistant", "content": "Hello, how are you doing?"},
    {"role": "user", "content": "Hello! I am Dhravya. I am 20 years old. I love to code!"},
    {"role": "user", "content": "Can I go to the club?"},
]

# Get user profile + relevant memories for context
profile = client.profile(container_tag=USER_ID, q=conversation[-1]["content"])

context = f"""Static profile:
{ "\n".join(profile.profile.static)}

Dynamic profile:
{"\n".join(profile.profile.dynamic)}

Relevant memories:
{"\n".join(r.content for r in profile.search_results.results)}"""

# Build messages with memory-enriched context
messages = [{"role": "system", "content": f"User context:\n{context}"}, *conversation]

# response = llm.chat(messages=messages)

# Store conversation for future context
client.add(
    content="\n".join(f"{m['role']}: {m['content']}" for m in conversation),
    container_tag=USER_ID,
)
