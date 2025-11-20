#!/usr/bin/env python3
"""
Integration test for Supermemory OpenAI middleware.

This script demonstrates how to test the middleware with real API calls.
Set your API keys as environment variables to run this test.
"""

import asyncio
import os
from openai import AsyncOpenAI, OpenAI
from supermemory_openai import (
    with_supermemory,
    OpenAIMiddlewareOptions,
    SupermemoryConfigurationError,
    SupermemoryAPIError,
)


async def test_async_middleware():
    """Test async middleware functionality."""
    print("🔄 Testing Async Middleware...")

    try:
        # Check for required environment variables
        if not os.getenv("OPENAI_API_KEY"):
            print("❌ OPENAI_API_KEY not set - skipping OpenAI test")
            return

        if not os.getenv("SUPERMEMORY_API_KEY"):
            print("❌ SUPERMEMORY_API_KEY not set - skipping Supermemory test")
            return

        # Create OpenAI client
        openai_client = AsyncOpenAI()

        # Wrap with Supermemory middleware
        openai_with_memory = with_supermemory(
            openai_client,
            container_tag="test-user-123",
            options=OpenAIMiddlewareOptions(
                mode="profile",
                verbose=True,
                add_memory="never"  # Don't save test messages
            )
        )

        # Test context manager
        async with openai_with_memory as client:
            print("✅ Context manager works")

            # Make a test request
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": "Hello! This is a test message."}
                ],
                max_tokens=50
            )

            print(f"✅ API call successful: {response.choices[0].message.content[:50]}...")

    except SupermemoryConfigurationError as e:
        print(f"⚠️  Configuration error: {e}")
    except SupermemoryAPIError as e:
        print(f"⚠️  Supermemory API error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def test_sync_middleware():
    """Test sync middleware functionality."""
    print("\n🔄 Testing Sync Middleware...")

    try:
        if not os.getenv("OPENAI_API_KEY"):
            print("❌ OPENAI_API_KEY not set - skipping OpenAI test")
            return

        if not os.getenv("SUPERMEMORY_API_KEY"):
            print("❌ SUPERMEMORY_API_KEY not set - skipping Supermemory test")
            return

        # Create sync OpenAI client
        openai_client = OpenAI()

        # Wrap with Supermemory middleware
        openai_with_memory = with_supermemory(
            openai_client,
            container_tag="test-user-sync-123",
            options=OpenAIMiddlewareOptions(
                mode="profile",
                verbose=True
            )
        )

        # Test context manager
        with openai_with_memory as client:
            print("✅ Sync context manager works")

            # Make a test request
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": "This is a sync test message."}
                ],
                max_tokens=50
            )

            print(f"✅ Sync API call successful: {response.choices[0].message.content[:50]}...")

    except SupermemoryConfigurationError as e:
        print(f"⚠️  Configuration error: {e}")
    except SupermemoryAPIError as e:
        print(f"⚠️  Supermemory API error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def test_error_handling():
    """Test error handling without API keys."""
    print("\n🔄 Testing Error Handling...")

    try:
        # Test with missing API key
        openai_client = OpenAI(api_key="fake-key")

        # This should raise SupermemoryConfigurationError
        with_supermemory(openai_client, "test-user")

        print("❌ Should have raised SupermemoryConfigurationError")

    except SupermemoryConfigurationError as e:
        print(f"✅ Correctly caught configuration error: {e}")
    except Exception as e:
        print(f"❌ Wrong exception type: {type(e).__name__}: {e}")


def test_background_tasks():
    """Test background task management."""
    print("\n🔄 Testing Background Task Management...")

    try:
        if not os.getenv("SUPERMEMORY_API_KEY"):
            print("❌ SUPERMEMORY_API_KEY not set - skipping background task test")
            return

        # Create a fake OpenAI client for testing
        from unittest.mock import Mock, AsyncMock

        openai_client = Mock()
        openai_client.chat = Mock()
        openai_client.chat.completions = Mock()
        openai_client.chat.completions.create = AsyncMock(return_value=Mock())

        # Wrap with memory storage enabled
        wrapped_client = with_supermemory(
            openai_client,
            container_tag="test-background-tasks",
            options=OpenAIMiddlewareOptions(
                add_memory="always",
                verbose=True
            )
        )

        print(f"✅ Background tasks tracking: {len(wrapped_client._background_tasks)} tasks")

    except Exception as e:
        print(f"❌ Background task test error: {e}")


async def main():
    """Run all tests."""
    print("🧪 Supermemory OpenAI Middleware Integration Tests")
    print("=" * 60)

    # Test async middleware
    await test_async_middleware()

    # Test sync middleware
    test_sync_middleware()

    # Test error handling
    test_error_handling()

    # Test background tasks
    test_background_tasks()

    print("\n" + "=" * 60)
    print("🎉 Integration tests completed!")
    print("\n💡 To run with real API calls, set these environment variables:")
    print("   export OPENAI_API_KEY='your-openai-key'")
    print("   export SUPERMEMORY_API_KEY='your-supermemory-key'")


if __name__ == "__main__":
    asyncio.run(main())