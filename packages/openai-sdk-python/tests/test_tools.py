"""Tests for tools module."""

import os
from dotenv import load_dotenv
import pytest
import json
from typing import List

from openai.types.chat import ChatCompletionMessageToolCall

load_dotenv()

# Import from the installed package or src directly
try:
    from supermemory_openai import (
        SupermemoryTools,
        SupermemoryToolsConfig,
        create_supermemory_tools,
        get_memory_tool_definitions,
        execute_memory_tool_calls,
        create_search_memories_tool,
        create_add_memory_tool,
    )
except ImportError:
    import sys
    import os

    sys.path.insert(
        0,
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "src"),
    )
    from supermemory_openai.tools import (
        SupermemoryTools,
        SupermemoryToolsConfig,
        create_supermemory_tools,
        get_memory_tool_definitions,
        execute_memory_tool_calls,
        create_search_memories_tool,
        create_add_memory_tool,
    )

# These classes don't exist in the current codebase - commenting out for now
# SupermemoryOpenAI,
# SupermemoryInfiniteChatConfigWithProviderName,

EXPECTED_TOOL_COUNT = 7


@pytest.fixture
def test_api_key() -> str:
    """Get test Supermemory API key from environment."""
    api_key = os.getenv("SUPERMEMORY_API_KEY")
    if not api_key:
        pytest.skip("SUPERMEMORY_API_KEY environment variable is required for tests")
    return api_key


@pytest.fixture
def test_provider_api_key() -> str:
    """Get test provider API key from environment."""
    api_key = os.getenv("PROVIDER_API_KEY")
    if not api_key:
        pytest.skip("PROVIDER_API_KEY environment variable is required for tests")
    return api_key


@pytest.fixture
def test_base_url() -> str:
    """Get test base URL from environment."""
    return os.getenv("SUPERMEMORY_BASE_URL", "")


@pytest.fixture
def test_model_name() -> str:
    """Get test model name from environment."""
    return os.getenv("MODEL_NAME", "gpt-5-nano")


class TestToolInitialization:
    """Test tool initialization."""

    def test_create_tools_with_default_configuration(self, test_api_key: str):
        """Test creating tools with default configuration."""
        config: SupermemoryToolsConfig = {}
        tools = SupermemoryTools(test_api_key, config)

        assert tools is not None
        assert tools.get_tool_definitions() is not None
        assert len(tools.get_tool_definitions()) == EXPECTED_TOOL_COUNT

    def test_create_tools_with_helper(self, test_api_key: str):
        """Test creating tools with createSupermemoryTools helper."""
        tools = create_supermemory_tools(
            test_api_key,
            {
                "project_id": "test-project",
            },
        )

        assert tools is not None
        assert tools.get_tool_definitions() is not None

    def test_create_tools_with_custom_base_url(
        self, test_api_key: str, test_base_url: str
    ):
        """Test creating tools with custom baseUrl."""
        if not test_base_url:
            pytest.skip("SUPERMEMORY_BASE_URL not provided")

        config: SupermemoryToolsConfig = {
            "base_url": test_base_url,
        }
        tools = SupermemoryTools(test_api_key, config)

        assert tools is not None
        assert len(tools.get_tool_definitions()) == EXPECTED_TOOL_COUNT

    def test_create_tools_with_project_id(self, test_api_key: str):
        """Test creating tools with projectId configuration."""
        config: SupermemoryToolsConfig = {
            "project_id": "test-project-123",
        }
        tools = SupermemoryTools(test_api_key, config)

        assert tools is not None
        assert len(tools.get_tool_definitions()) == EXPECTED_TOOL_COUNT

    def test_create_tools_with_custom_container_tags(self, test_api_key: str):
        """Test creating tools with custom container tags."""
        config: SupermemoryToolsConfig = {
            "container_tags": ["custom-tag-1", "custom-tag-2"],
        }
        tools = SupermemoryTools(test_api_key, config)

        assert tools is not None
        assert len(tools.get_tool_definitions()) == EXPECTED_TOOL_COUNT


class TestToolDefinitions:
    """Test tool definitions."""

    def test_return_proper_openai_function_definitions(self):
        """Test returning proper OpenAI function definitions."""
        definitions = get_memory_tool_definitions()

        assert definitions is not None
        assert len(definitions) == EXPECTED_TOOL_COUNT

        # Check searchMemories
        search_tool = next(
            (d for d in definitions if d["function"]["name"] == "search_memories"), None
        )
        assert search_tool is not None
        assert search_tool["type"] == "function"
        assert "information_to_get" in search_tool["function"]["parameters"]["required"]
        assert (
            "include_full_docs"
            not in search_tool["function"]["parameters"]["properties"]
        )

        # Check addMemory
        add_tool = next(
            (d for d in definitions if d["function"]["name"] == "add_memory"), None
        )
        assert add_tool is not None
        assert add_tool["type"] == "function"
        assert "memory" in add_tool["function"]["parameters"]["required"]

    def test_consistent_tool_definitions_from_class_and_helper(self, test_api_key: str):
        """Test that tool definitions are consistent between class and helper."""
        tools = SupermemoryTools(test_api_key)
        class_definitions = tools.get_tool_definitions()
        helper_definitions = get_memory_tool_definitions()

        assert class_definitions == helper_definitions


class TestMemoryOperationsUnit:
    """Unit tests for memory operations (no live API)."""

    @pytest.mark.asyncio
    async def test_add_memory_uses_client_add(self):
        """add_memory must call client.add (memories.add was removed in supermemory 3.50)."""
        from types import SimpleNamespace
        from unittest.mock import AsyncMock

        tools = SupermemoryTools("test-key", {"container_tags": ["unit-tag"]})
        tools.client.add = AsyncMock(
            return_value=SimpleNamespace(
                id="doc_123",
                status="queued",
                model_dump=lambda: {"id": "doc_123", "status": "queued"},
            )
        )

        result = await tools.add_memory("User likes tea")

        assert result["success"] is True
        assert result["memory"]["id"] == "doc_123"
        tools.client.add.assert_awaited_once_with(
            content="User likes tea",
            container_tags=["unit-tag"],
        )

    @pytest.mark.asyncio
    async def test_search_memories_uses_search_memories_hybrid(self):
        """V4 search must use the primary singular tag and hybrid mode."""
        from types import SimpleNamespace
        from unittest.mock import AsyncMock

        tools = SupermemoryTools(
            "test-key", {"container_tags": ["primary-tag", "secondary-tag"]}
        )
        tools.client.search.memories = AsyncMock(
            return_value=SimpleNamespace(
                results=[SimpleNamespace(model_dump=lambda: {"memory": "likes tea"})]
            )
        )

        with pytest.warns(DeprecationWarning, match="include_full_docs"):
            result = await tools.search_memories(
                "tea", include_full_docs=False, limit=3
            )

        assert result["success"] is True
        assert result["count"] == 1
        tools.client.search.memories.assert_awaited_once()
        kwargs = tools.client.search.memories.await_args.kwargs
        assert kwargs["q"] == "tea"
        assert kwargs["container_tag"] == "primary-tag"
        assert "container_tags" not in kwargs
        assert "include_full_docs" not in kwargs
        assert kwargs["limit"] == 3
        assert kwargs["search_mode"] == "hybrid"

    @pytest.mark.asyncio
    async def test_get_profile_uses_client_profile(self):
        """get_profile must call client.profile with container tag and optional query."""
        from types import SimpleNamespace
        from unittest.mock import AsyncMock

        tools = SupermemoryTools("test-key", {"container_tags": ["unit-tag"]})
        tools.client.profile = AsyncMock(
            return_value=SimpleNamespace(
                profile={"static": ["likes tea"], "dynamic": []},
                search_results={"results": []},
            )
        )

        result = await tools.get_profile(query="tea")

        assert result["success"] is True
        tools.client.profile.assert_awaited_once_with(
            container_tag="unit-tag",
            q="tea",
        )

    @pytest.mark.asyncio
    async def test_document_list_uses_client_documents_list(self):
        """document_list must call client.documents.list with container tag."""
        from types import SimpleNamespace
        from unittest.mock import AsyncMock

        tools = SupermemoryTools("test-key", {"container_tags": ["unit-tag"]})
        tools.client.documents.list = AsyncMock(
            return_value=SimpleNamespace(
                memories=[{"id": "doc_1"}],
                pagination={"page": 1},
            )
        )

        result = await tools.document_list(limit=5, page=2)

        assert result["success"] is True
        tools.client.documents.list.assert_awaited_once_with(
            container_tags=["unit-tag"],
            limit=5,
            page=2,
        )

    @pytest.mark.asyncio
    async def test_memory_forget_requires_id_or_content(self):
        """memory_forget must reject calls without memory_id or memory_content."""
        tools = SupermemoryTools("test-key", {"container_tags": ["unit-tag"]})
        result = await tools.memory_forget()

        assert result["success"] is False
        assert "memory_id or memory_content" in result["error"]

    def test_rejects_project_id_and_container_tags(self):
        """Config must reject both project_id and container_tags."""
        from supermemory_openai.exceptions import SupermemoryConfigurationError

        with pytest.raises(SupermemoryConfigurationError):
            SupermemoryTools(
                "test-key",
                {
                    "project_id": "abc",
                    "container_tags": ["tag-a"],
                },
            )


class TestMemoryOperations:
    """Test memory operations."""

    @pytest.mark.asyncio
    async def test_search_memories(self, test_api_key: str, test_base_url: str):
        """Test searching memories."""
        config: SupermemoryToolsConfig = {
            "project_id": "test-search",
        }
        if test_base_url:
            config["base_url"] = test_base_url

        tools = SupermemoryTools(test_api_key, config)

        result = await tools.search_memories(
            information_to_get="test preferences",
            limit=5,
        )

        assert result is not None
        assert "success" in result
        assert isinstance(result["success"], bool)

        if result["success"]:
            assert "results" in result
            assert "count" in result
            assert isinstance(result["count"], int)
        else:
            assert "error" in result

    @pytest.mark.asyncio
    async def test_add_memory(self, test_api_key: str, test_base_url: str):
        """Test adding memory."""
        config: SupermemoryToolsConfig = {
            "container_tags": ["test-add-memory"],
        }
        if test_base_url:
            config["base_url"] = test_base_url

        tools = SupermemoryTools(test_api_key, config)

        result = await tools.add_memory(
            memory="User prefers dark roast coffee in the morning - test memory"
        )

        assert result is not None
        assert "success" in result
        assert isinstance(result["success"], bool)

        if result["success"]:
            assert "memory" in result
        else:
            assert "error" in result


class TestIndividualToolCreators:
    """Test individual tool creators."""

    def test_create_individual_search_tool(self, test_api_key: str):
        """Test creating individual search tool."""
        search_tool = create_search_memories_tool(
            test_api_key,
            {
                "project_id": "test-individual",
            },
        )

        assert search_tool is not None
        assert search_tool.definition is not None
        assert callable(search_tool.execute)
        assert search_tool.definition["function"]["name"] == "search_memories"

    def test_create_individual_add_tool(self, test_api_key: str):
        """Test creating individual add tool."""
        add_tool = create_add_memory_tool(
            test_api_key,
            {
                "project_id": "test-individual",
            },
        )

        assert add_tool is not None
        assert add_tool.definition is not None
        assert callable(add_tool.execute)
        assert add_tool.definition["function"]["name"] == "add_memory"


class TestOpenAIIntegration:
    """Test OpenAI integration."""

    def test_placeholder(self):
        """Placeholder test for OpenAI integration."""
        # TODO: Implement proper OpenAI integration tests when
        # SupermemoryOpenAI and SupermemoryInfiniteChatConfigWithProviderName classes are available
        assert True

    # TODO: Uncomment this test when SupermemoryOpenAI and
    # SupermemoryInfiniteChatConfigWithProviderName classes are implemented

    # @pytest.mark.asyncio
    # async def test_work_with_supermemory_openai_for_function_calling(
    #     self,
    #     test_api_key: str,
    #     test_provider_api_key: str,
    #     test_model_name: str,
    #     test_base_url: str,
    # ):
    #     """Test working with SupermemoryOpenAI for function calling."""
    #     client = SupermemoryOpenAI(
    #         test_api_key,
    #         SupermemoryInfiniteChatConfigWithProviderName(
    #             provider_name="openai",
    #             provider_api_key=test_provider_api_key,
    #         ),
    #     )

    #     tools_config: SupermemoryToolsConfig = {
    #         "project_id": "test-openai-integration",
    #     }
    #     if test_base_url:
    #         tools_config["base_url"] = test_base_url

    #     tools = SupermemoryTools(test_api_key, tools_config)

    #     response = await client.chat_completion(
    #         messages=[
    #             {
    #                 "role": "system",
    #                 "content": (
    #                     "You are a helpful assistant with access to user memories. "
    #                     "When the user asks you to remember something, use the add_memory tool."
    #                 ),
    #             },
    #             {
    #                 "role": "user",
    #                 "content": "Please remember that I prefer tea over coffee",
    #             },
    #         ],
    #         model=test_model_name,
    #         tools=tools.get_tool_definitions(),
    #     )

    #     assert response is not None
    #     assert hasattr(response, "choices")

    #     choice = response.choices[0]
    #     assert choice.message is not None

    #     # If the model decided to use function calling, test the execution
    #     if hasattr(choice.message, "tool_calls") and choice.message.tool_calls:
    #         tool_results = await execute_memory_tool_calls(
    #             test_api_key,
    #             choice.message.tool_calls,
    #             tools_config,
    #         )

    #         assert tool_results is not None
    #         assert len(tool_results) == len(choice.message.tool_calls)

    #         for result in tool_results:
    #             assert result["role"] == "tool"
    #             assert "content" in result
    #             assert "tool_call_id" in result

    @pytest.mark.asyncio
    async def test_handle_multiple_tool_calls(
        self, test_api_key: str, test_base_url: str
    ):
        """Test handling multiple tool calls."""
        tools_config: SupermemoryToolsConfig = {
            "container_tags": ["test-multi-tools"],
        }
        if test_base_url:
            tools_config["base_url"] = test_base_url

        # Simulate tool calls (normally these would come from OpenAI)
        mock_tool_calls: List[ChatCompletionMessageToolCall] = [
            ChatCompletionMessageToolCall(
                id="call_1",
                type="function",
                function={
                    "name": "search_memories",
                    "arguments": json.dumps({"information_to_get": "preferences"}),
                },
            ),
            ChatCompletionMessageToolCall(
                id="call_2",
                type="function",
                function={
                    "name": "add_memory",
                    "arguments": json.dumps(
                        {"memory": "Test memory for multiple calls"}
                    ),
                },
            ),
        ]

        results = await execute_memory_tool_calls(
            test_api_key, mock_tool_calls, tools_config
        )

        assert results is not None
        assert len(results) == 2

        assert results[0]["tool_call_id"] == "call_1"
        assert results[1]["tool_call_id"] == "call_2"

        for result in results:
            assert result["role"] == "tool"
            assert "content" in result

            content = json.loads(result["content"])
            assert "success" in content
