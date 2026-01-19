import os
from dotenv import load_dotenv
from supermemory import Supermemory

load_dotenv()

client = Supermemory()


def test_search_modes():
    """Test different search modes"""
    print("=== Search Modes ===")

    # Hybrid search
    hybrid = client.search.memories(
        q="quarterly goals",
        container_tag="user_123",
        search_mode="hybrid",
    )
    print(f"✓ hybrid search: {len(hybrid.results)} results")

    # Memories only
    memories = client.search.memories(
        q="user preferences",
        container_tag="user_123",
        search_mode="memories",
    )
    print(f"✓ memories search: {len(memories.results)} results")


def test_filtering():
    """Test search filtering"""
    print("\n=== Filtering ===")

    # Basic containerTag filter
    results = client.search.memories(
        q="project updates",
        container_tag="user_123",
        search_mode="hybrid",
    )
    print(f"✓ containerTag filter: {len(results.results)} results")

    # Metadata filtering
    filtered = client.search.memories(
        q="meeting notes",
        container_tag="user_123",
        filters={
            "AND": [
                {"key": "type", "value": "meeting"},
                {"key": "year", "value": "2024"},
            ]
        },
    )
    print(f"✓ metadata filter: {len(filtered.results)} results")


def test_reranking():
    """Test reranking"""
    print("\n=== Reranking ===")

    results = client.search.memories(
        q="complex technical question",
        container_tag="user_123",
        rerank=True,
    )
    print(f"✓ reranking: {len(results.results)} results")


def test_threshold():
    """Test similarity threshold"""
    print("\n=== Threshold ===")

    broad = client.search.memories(q="test query", threshold=0.3)
    print(f"✓ broad threshold (0.3): {len(broad.results)} results")

    precise = client.search.memories(q="test query", threshold=0.8)
    print(f"✓ precise threshold (0.8): {len(precise.results)} results")


def test_chatbot_context():
    """Test chatbot context pattern"""
    print("\n=== Chatbot Context Pattern ===")

    def get_context(user_id: str, message: str) -> str:
        results = client.search.memories(
            q=message,
            container_tag=user_id,
            search_mode="hybrid",
            threshold=0.6,
            limit=5,
        )
        return "\n\n".join(r.memory or r.chunk or "" for r in results.results)

    context = get_context("user_123", "What are the project updates?")
    print(f"✓ chatbot context: {len(context)} chars")


def main():
    print("Search Tests")
    print("============\n")

    test_search_modes()
    test_filtering()
    test_reranking()
    test_threshold()
    test_chatbot_context()

    print("\n============")
    print("✅ All search tests passed!")


if __name__ == "__main__":
    main()
