import os
from dotenv import load_dotenv

load_dotenv()

from supermemory import Supermemory

client = Supermemory()
USER_ID = "docs-test-user-py"

conversation = [
    {"role": "assistant", "content": "Hello, how are you doing?"},
    {"role": "user", "content": "Hello! I am Dhravya. I am 20 years old. I love to code!"},
    {"role": "user", "content": "Can I go to the club?"},
]

print("Testing quickstart Python code...\n")

# Get user profile + relevant memories for context
print("1. Getting user profile...")
profile = client.profile(container_tag=USER_ID, q=conversation[-1]["content"])

print(f"Profile response: {profile}")

def get_memory(r):
    if hasattr(r, 'memory'):
        return r.memory
    return r.get('memory', '') if isinstance(r, dict) else str(r)

context = f"""Static profile:
{chr(10).join(profile.profile.static)}

Dynamic profile:
{chr(10).join(profile.profile.dynamic)}

Relevant memories:
{chr(10).join(get_memory(r) for r in profile.search_results.results)}"""

print(f"\n2. Built context: {context}")

# Build messages with memory-enriched context
messages = [{"role": "system", "content": f"User context:\n{context}"}, *conversation]
print("\n3. Messages built successfully")

# Store conversation for future context
print("\n4. Adding memory...")
add_result = client.add(
    content="\n".join(f"{m['role']}: {m['content']}" for m in conversation),
    container_tag=USER_ID,
)

print(f"Add result: {add_result}")
print("\n✅ Quickstart Python test passed!")
