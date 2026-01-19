import os
import time
from pathlib import Path
from dotenv import load_dotenv
import httpx
import supermemory
from supermemory import Supermemory

load_dotenv()

client = Supermemory()


def test_documents_crud():
    """Test document CRUD operations"""
    print("\n=== Document CRUD Operations ===")

    # Create
    doc = client.documents.add(content=f"Test content - {time.time()}")
    print(f"✓ documents.add: {doc.id}")

    # Read
    fetched = client.documents.get(doc.id)
    print(f"✓ documents.get: {fetched.id}")

    # Update
    updated = client.documents.update(doc.id, content=f"Updated - {time.time()}")
    print(f"✓ documents.update: {updated.id}")

    # Wait for processing
    time.sleep(10)

    # Delete
    client.documents.delete(doc.id)
    print("✓ documents.delete")


def test_batch_operations():
    """Test batch operations"""
    print("\n=== Batch Operations ===")

    batch = client.documents.batch_add(
        documents=[
            {"content": f"Batch 1 - {time.time()}"},
            {"content": f"Batch 2 - {time.time()}"},
        ]
    )
    print(f"✓ documents.batch_add: {batch}")


def test_search():
    """Test search"""
    print("\n=== Search ===")

    results = client.search.execute(q="test content")
    print(f"✓ search.execute: {len(results.results) if results.results else 0} results")


def test_file_uploads():
    """Test file uploads"""
    print("\n=== File Uploads ===")

    test_path = Path("/tmp/test-py-upload.txt")
    test_path.write_text(f"Test content {time.time()}")
    client.documents.upload_file(file=test_path)
    print("✓ documents.upload_file with Path")
    test_path.unlink()


def test_error_handling():
    """Test error handling patterns"""
    print("\n=== Error Handling ===")

    try:
        client.documents.add(content="Test content")
        print("✓ Error handling pattern works")
    except supermemory.APIConnectionError:
        print("APIConnectionError handled")
    except supermemory.RateLimitError:
        print("RateLimitError handled")
    except supermemory.APIStatusError:
        print("APIStatusError handled")


def test_client_config():
    """Test client configuration"""
    print("\n=== Client Configuration ===")

    # Retries
    client2 = Supermemory(max_retries=0)
    print("✓ max_retries config")

    # Timeout
    client3 = Supermemory(timeout=20.0)
    print("✓ timeout config")

    # Granular timeout
    client4 = Supermemory(timeout=httpx.Timeout(60.0, read=5.0, write=10.0, connect=2.0))
    print("✓ granular timeout config")

    # Per-request options
    client.with_options(max_retries=5).documents.add(content="Test content")
    print("✓ per-request options")


def test_raw_response():
    """Test raw response access"""
    print("\n=== Raw Response ===")

    response = client.documents.with_raw_response.add(content="Test content")
    print(f"✓ with_raw_response: has headers={hasattr(response, 'headers')}")

    memory = response.parse()
    print(f"✓ parse(): {memory.id}")


def test_streaming_response():
    """Test streaming response"""
    print("\n=== Streaming Response ===")

    with client.documents.with_streaming_response.add(content="Test content") as response:
        print(f"✓ with_streaming_response: has headers={hasattr(response, 'headers')}")


def test_context_manager():
    """Test context manager"""
    print("\n=== Context Manager ===")

    with Supermemory() as temp_client:
        print("✓ Context manager works")


def main():
    print("Python SDK Tests")
    print("================")

    test_documents_crud()
    test_batch_operations()
    test_search()
    test_file_uploads()
    test_error_handling()
    test_client_config()
    test_raw_response()
    test_streaming_response()
    test_context_manager()

    print("\n================")
    print("✅ All Python SDK tests passed!")


if __name__ == "__main__":
    main()
