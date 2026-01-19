import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def test_openai_with_supermemory():
    """Test OpenAI SDK with Supermemory context"""
    print("=== OpenAI SDK with Supermemory ===")

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠ OPENAI_API_KEY not set, skipping live tests")
        return

    # This demonstrates manual integration pattern for Python
    # since @supermemory/tools is TypeScript-only

    from supermemory import Supermemory

    memory_client = Supermemory()
    openai_client = OpenAI()

    USER_ID = "docs-test-openai-py"

    # Get memory context
    profile = memory_client.profile(
        container_tag=USER_ID,
        q="What are my preferences?",
    )

    context = f"""User Profile:
{chr(10).join(profile.profile.static)}

Relevant Memories:
{chr(10).join(r.content for r in profile.search_results.results)}"""

    print("✓ Got memory context")

    # Use with OpenAI
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": f"Use this context:\n{context}"},
            {"role": "user", "content": "What do you know about me?"},
        ],
        max_tokens=100,
    )
    print(f"✓ OpenAI response: {response.choices[0].message.content[:50]}...")


def test_save_conversation():
    """Test saving conversation to Supermemory"""
    print("\n=== Save Conversation ===")

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠ Skipped (no OPENAI_API_KEY)")
        return

    from supermemory import Supermemory

    memory_client = Supermemory()
    USER_ID = "docs-test-openai-py"

    conversation = [
        {"role": "user", "content": "My favorite programming language is Python"},
        {"role": "assistant", "content": "That's great! Python is very versatile."},
    ]

    # Save conversation
    memory_client.add(
        content="\n".join(f"{m['role']}: {m['content']}" for m in conversation),
        container_tag=USER_ID,
    )
    print("✓ Saved conversation to memory")


def main():
    print("OpenAI SDK Integration Tests (Python)")
    print("=====================================\n")

    test_openai_with_supermemory()
    test_save_conversation()

    print("\n=====================================")
    print("✅ All OpenAI SDK tests passed!")


if __name__ == "__main__":
    main()
