import os
import time
from dotenv import load_dotenv
from supermemory import Supermemory

load_dotenv()

client = Supermemory()
USER_ID = "docs-test-profiles-py"


def test_basic_profile():
    """Test basic profile retrieval"""
    print("=== Basic Profile ===")

    profile = client.profile(
        container_tag=USER_ID,
        q="What are my preferences?",
    )

    print(f"✓ Static profile: {len(profile.profile.static)} items")
    print(f"✓ Dynamic profile: {len(profile.profile.dynamic)} items")
    print(f"✓ Search results: {len(profile.search_results.results)} items")


def test_profile_with_memories():
    """Test profile with memory context"""
    print("\n=== Profile with Memory Context ===")

    # Add some memories
    client.add(
        content="User prefers dark mode for all applications",
        container_tag=USER_ID,
    )
    client.add(
        content="User is learning TypeScript and Rust",
        container_tag=USER_ID,
    )

    # Wait for indexing
    time.sleep(2)

    # Get profile with search
    profile = client.profile(
        container_tag=USER_ID,
        q="What programming languages does the user know?",
    )

    print("✓ Profile retrieved with memories")
    print(f"  Static: {profile.profile.static[:2]}")
    print(f"  Dynamic: {profile.profile.dynamic[:2]}")


def get_memory(r):
    if hasattr(r, 'memory'):
        return r.memory
    return r.get('memory', '') if isinstance(r, dict) else str(r)


def test_building_context():
    """Test building LLM context"""
    print("\n=== Building LLM Context ===")

    conversation = [{"role": "user", "content": "What theme should I use for my IDE?"}]

    profile = client.profile(
        container_tag=USER_ID,
        q=conversation[-1]["content"],
    )

    context = f"""User Profile:
{chr(10).join(profile.profile.static)}

Recent Context:
{chr(10).join(profile.profile.dynamic)}

Relevant Memories:
{chr(10).join(get_memory(r) for r in profile.search_results.results)}"""

    print(f"✓ Built context: {len(context)} chars")

    messages = [
        {"role": "system", "content": f"Use this context about the user:\n{context}"},
        *conversation,
    ]
    print(f"✓ Messages ready for LLM: {len(messages)} messages")


def main():
    print("User Profiles Tests")
    print("===================\n")

    test_basic_profile()
    test_profile_with_memories()
    test_building_context()

    print("\n===================")
    print("✅ All user profile tests passed!")


if __name__ == "__main__":
    main()
