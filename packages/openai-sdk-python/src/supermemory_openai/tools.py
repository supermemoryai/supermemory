"""Supermemory tools for OpenAI function calling."""

import json
from typing import Any, Dict, List, Optional, TypedDict, Union

import supermemory
from openai.types.chat import (
    ChatCompletionFunctionToolParam,
    ChatCompletionMessageToolCall,
    ChatCompletionToolMessageParam,
    ChatCompletionToolParam,
)
from supermemory.types import (
    AddResponse,
    DocumentGetResponse,
    SearchMemoriesResponse,
)
from supermemory.types.search_memories_response import Result

from .exceptions import (
    SupermemoryConfigurationError,
    SupermemoryMemoryOperationError,
    SupermemoryNetworkError,
)
from .forget_memory import DEFAULT_BASE_URL, forget_memory_request

TOOL_DESCRIPTIONS = {
    "search_memories": (
        "Search (recall) stored memories for facts, preferences, history, and context about the user "
        "or any topic. Use proactively before answering whenever memory could help — do not wait for "
        "the user to explicitly ask you to search or recall. Search when the question touches personal "
        "context, past conversations, preferences, projects, people, plans, or anything you may have "
        "learned before. Results include memory/chunk IDs — use those IDs with memory_forget to remove "
        "a specific learned fact."
    ),
    "add_memory": (
        "Add (remember) memories/details/information about the user or other facts or entities. "
        "Run when explicitly asked or when the user mentions any information generalizable beyond "
        "the context of the current conversation."
    ),
    "get_profile": (
        "Get user profile containing static memories (permanent facts) and dynamic memories "
        "(recent context). Optionally include search results by providing a query. "
        "Profile and search result entries may include memory IDs useful for memory_forget."
    ),
    "document_list": (
        "List stored source documents (conversations, URLs, files, pasted text) with pagination. "
        "Returns document IDs for document_delete — not memory IDs for memory_forget. "
        "Use to browse raw stored content before permanently removing a source."
    ),
    "document_delete": (
        "Permanently delete a stored document and ALL memories extracted from it (hard delete). "
        "Use document IDs from document_list. Use when the user wants to remove an entire "
        "conversation, file, URL, or other source — not when correcting a single learned fact "
        "(use memory_forget for that)."
    ),
    "document_add": (
        "Store a source document for asynchronous processing and automatic memory extraction. "
        "Use when the user gives you raw content to ingest — a pasted text blob, conversation transcript, "
        "chat history, notes, URL, article link, or other substantial text — rather than a single atomic "
        "fact (use add_memory for one short generalizable sentence). The document is queued immediately; "
        "Supermemory post-processes it in the background (chunking, embedding, indexing) and extracts profile "
        "memories automatically — you do not need to call add_memory for facts buried inside the document. "
        "Good for saving full conversations, long-form notes, knowledge-base articles, meeting transcripts, "
        "or any large body of text the user wants remembered beyond this chat turn. Processing may take a "
        "moment; extracted memories appear in profile/search after indexing completes."
    ),
    "memory_forget": (
        "Soft-delete a single extracted profile memory (a learned fact) so it no longer appears in "
        "profile or search. Does NOT delete source documents. Provide memory_id (preferred — from "
        "search_memories or get_profile) OR memory_content for an exact text match. Use when the "
        "user retracts or corrects a specific fact (e.g. 'forget I like tea', 'that's wrong'). "
        "To remove an entire conversation or file, use document_delete instead."
    ),
}

PARAMETER_DESCRIPTIONS = {
    "information_to_get": (
        "What to look up in memory — keywords from the user's message, topic, entity names, or "
        "question phrasing. Search even when the user did not explicitly ask you to recall."
    ),
    "include_full_docs": (
        "Whether to include the full document content in the response. "
        "Defaults to true for better AI context."
    ),
    "limit": "Maximum number of results to return",
    "memory": (
        "The text content of the memory to add. This should be a single sentence or a short paragraph."
    ),
    "container_tag": "Tag to filter/scope the operation (e.g., user ID, project ID)",
    "query": "Optional search query to include relevant search results",
    "page": "Page number to fetch, 1-based (default: 1)",
    "document_id": (
        "Document ID from document_list — permanently deletes the source document and all "
        "extracted memories. Not a profile memory ID."
    ),
    "content": (
        "Document body to store — plain text, a conversation transcript, a long pasted blob, or a URL "
        "to a webpage/PDF/image/video. Content is queued and memories are extracted automatically after "
        "background processing; do not split into add_memory calls."
    ),
    "title": "Optional title for the document",
    "description": "Optional description for the document",
    "memory_id": (
        "Profile memory ID from search_memories or get_profile — soft-deletes one learned fact. "
        "Not a document ID."
    ),
    "memory_content": (
        "Exact text of the profile memory to forget (alternative to memory_id). Must match "
        "precisely; if unsure, search first and use memory_id."
    ),
    "reason": "Optional reason recorded when forgetting (e.g. outdated, user correction)",
}

DEFAULT_LIMIT = 10
DEFAULT_CHUNK_THRESHOLD = 0.6
DEFAULT_INCLUDE_FULL_DOCS = True

ALL_TOOL_NAMES = (
    "search_memories",
    "add_memory",
    "get_profile",
    "document_list",
    "document_delete",
    "document_add",
    "memory_forget",
)


class SupermemoryToolsConfig(TypedDict, total=False):
    """Configuration for Supermemory tools.

    Only one of `project_id` or `container_tags` can be provided.
    """

    base_url: Optional[str]
    container_tags: Optional[List[str]]
    project_id: Optional[str]


# Type aliases using inferred types from supermemory package
MemoryObject = Union[DocumentGetResponse, AddResponse]


class MemorySearchResult(TypedDict, total=False):
    """Result type for memory search operations."""

    success: bool
    results: Optional[List[Result]]
    count: Optional[int]
    error: Optional[str]


class MemoryAddResult(TypedDict, total=False):
    """Result type for memory add operations."""

    success: bool
    memory: Optional[Dict[str, object]]
    error: Optional[str]


class ProfileResult(TypedDict, total=False):
    """Result type for profile operations."""

    success: bool
    profile: Optional[Dict[str, Any]]
    search_results: Optional[Any]
    error: Optional[str]


class DocumentListResult(TypedDict, total=False):
    """Result type for document list operations."""

    success: bool
    documents: Optional[List[Any]]
    pagination: Optional[Any]
    error: Optional[str]


class DocumentDeleteResult(TypedDict, total=False):
    """Result type for document delete operations."""

    success: bool
    message: Optional[str]
    error: Optional[str]


class DocumentAddResult(TypedDict, total=False):
    """Result type for document add operations."""

    success: bool
    document: Optional[Dict[str, object]]
    error: Optional[str]


class MemoryForgetResult(TypedDict, total=False):
    """Result type for memory forget operations."""

    success: bool
    message: Optional[str]
    error: Optional[str]


# Function schemas for OpenAI function calling
MEMORY_TOOL_SCHEMAS: Dict[str, ChatCompletionFunctionToolParam] = {
    "search_memories": {
        "name": "search_memories",
        "description": TOOL_DESCRIPTIONS["search_memories"],
        "parameters": {
            "type": "object",
            "properties": {
                "information_to_get": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["information_to_get"],
                },
                "include_full_docs": {
                    "type": "boolean",
                    "description": PARAMETER_DESCRIPTIONS["include_full_docs"],
                    "default": DEFAULT_INCLUDE_FULL_DOCS,
                },
                "limit": {
                    "type": "number",
                    "description": PARAMETER_DESCRIPTIONS["limit"],
                    "default": DEFAULT_LIMIT,
                },
            },
            "required": ["information_to_get"],
        },
    },
    "add_memory": {
        "name": "add_memory",
        "description": TOOL_DESCRIPTIONS["add_memory"],
        "parameters": {
            "type": "object",
            "properties": {
                "memory": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["memory"],
                },
            },
            "required": ["memory"],
        },
    },
    "get_profile": {
        "name": "get_profile",
        "description": TOOL_DESCRIPTIONS["get_profile"],
        "parameters": {
            "type": "object",
            "properties": {
                "container_tag": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["container_tag"],
                },
                "query": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["query"],
                },
            },
            "required": [],
        },
    },
    "document_list": {
        "name": "document_list",
        "description": TOOL_DESCRIPTIONS["document_list"],
        "parameters": {
            "type": "object",
            "properties": {
                "container_tag": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["container_tag"],
                },
                "limit": {
                    "type": "number",
                    "description": PARAMETER_DESCRIPTIONS["limit"],
                    "default": DEFAULT_LIMIT,
                },
                "page": {
                    "type": "number",
                    "description": PARAMETER_DESCRIPTIONS["page"],
                },
            },
            "required": [],
        },
    },
    "document_delete": {
        "name": "document_delete",
        "description": TOOL_DESCRIPTIONS["document_delete"],
        "parameters": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["document_id"],
                },
            },
            "required": ["document_id"],
        },
    },
    "document_add": {
        "name": "document_add",
        "description": TOOL_DESCRIPTIONS["document_add"],
        "parameters": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["content"],
                },
                "title": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["title"],
                },
                "description": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["description"],
                },
            },
            "required": ["content"],
        },
    },
    "memory_forget": {
        "name": "memory_forget",
        "description": TOOL_DESCRIPTIONS["memory_forget"],
        "parameters": {
            "type": "object",
            "properties": {
                "container_tag": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["container_tag"],
                },
                "memory_id": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["memory_id"],
                },
                "memory_content": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["memory_content"],
                },
                "reason": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["reason"],
                },
            },
            "required": [],
        },
    },
}


def _resolve_container_tags(config: SupermemoryToolsConfig) -> List[str]:
    if config.get("project_id") is not None and config.get("container_tags") is not None:
        raise SupermemoryConfigurationError(
            "Supermemory tools config accepts either project_id or container_tags, not both."
        )
    if config.get("project_id"):
        return [f"sm_project_{config['project_id']}"]
    if config.get("container_tags"):
        return config["container_tags"]
    return ["sm_project_default"]


def _tool_definition(name: str) -> ChatCompletionToolParam:
    return {"type": "function", "function": MEMORY_TOOL_SCHEMAS[name]}


def _all_tool_definitions() -> List[ChatCompletionFunctionToolParam]:
    return [{"type": "function", "function": MEMORY_TOOL_SCHEMAS[name]} for name in ALL_TOOL_NAMES]


class SupermemoryTools:
    """Create memory tool handlers for OpenAI function calling."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        """Initialize SupermemoryTools.

        Args:
            api_key: Supermemory API key
            config: Optional configuration
        """
        config = config or {}
        self.api_key = api_key
        self.base_url = config.get("base_url") or DEFAULT_BASE_URL

        client_kwargs = {"api_key": api_key}
        if config.get("base_url"):
            client_kwargs["base_url"] = config["base_url"]

        self.client = supermemory.AsyncSupermemory(**client_kwargs)
        self.container_tags = _resolve_container_tags(config)

    def _primary_container_tag(self, container_tag: Optional[str] = None) -> str:
        return container_tag or self.container_tags[0]

    def get_tool_definitions(self) -> List[ChatCompletionFunctionToolParam]:
        """Get OpenAI function definitions for all memory tools."""
        return _all_tool_definitions()

    async def execute_tool_call(self, tool_call: ChatCompletionMessageToolCall) -> str:
        """Execute a tool call based on the function name and arguments."""
        function_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        handlers = {
            "search_memories": self.search_memories,
            "add_memory": self.add_memory,
            "get_profile": self.get_profile,
            "document_list": self.document_list,
            "document_delete": self.document_delete,
            "document_add": self.document_add,
            "memory_forget": self.memory_forget,
        }

        handler = handlers.get(function_name)
        if handler is None:
            result: Dict[str, object] = {
                "success": False,
                "error": f"Unknown function: {function_name}",
            }
        else:
            result = await handler(**args)

        return json.dumps(result)

    async def search_memories(
        self,
        information_to_get: str,
        include_full_docs: bool = DEFAULT_INCLUDE_FULL_DOCS,
        limit: int = DEFAULT_LIMIT,
    ) -> MemorySearchResult:
        """Search memories."""
        try:
            response: SearchMemoriesResponse = await self.client.search.memories(
                q=information_to_get,
                container_tags=self.container_tags,
                limit=limit,
                threshold=DEFAULT_CHUNK_THRESHOLD,
                search_mode="hybrid",
            )

            results = response.results or []
            return MemorySearchResult(
                success=True,
                results=[r.model_dump() for r in results],
                count=len(results),
            )
        except (OSError, ConnectionError) as network_error:
            return MemorySearchResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return MemorySearchResult(
                success=False,
                error=f"Memory search failed: {error}",
            )

    async def add_memory(self, memory: str) -> MemoryAddResult:
        """Add a memory."""
        try:
            response: AddResponse = await self.client.add(
                content=memory,
                container_tags=self.container_tags,
            )

            return MemoryAddResult(
                success=True,
                memory=response.model_dump(),
            )
        except (OSError, ConnectionError) as network_error:
            return MemoryAddResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return MemoryAddResult(
                success=False,
                error=f"Memory add failed: {error}",
            )

    async def get_profile(
        self,
        container_tag: Optional[str] = None,
        query: Optional[str] = None,
    ) -> ProfileResult:
        """Get user profile with optional query-scoped search results."""
        try:
            kwargs: Dict[str, Any] = {
                "container_tag": self._primary_container_tag(container_tag),
            }
            if query:
                kwargs["q"] = query

            response = await self.client.profile(**kwargs)
            profile = response.profile if hasattr(response, "profile") else None
            search_results = (
                response.search_results if hasattr(response, "search_results") else None
            )

            return ProfileResult(
                success=True,
                profile=profile if isinstance(profile, dict) else None,
                search_results=search_results,
            )
        except (OSError, ConnectionError) as network_error:
            return ProfileResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return ProfileResult(
                success=False,
                error=f"Profile fetch failed: {error}",
            )

    async def document_list(
        self,
        container_tag: Optional[str] = None,
        limit: Optional[int] = None,
        page: Optional[int] = None,
    ) -> DocumentListResult:
        """List stored documents."""
        try:
            kwargs: Dict[str, Any] = {
                "container_tags": [self._primary_container_tag(container_tag)],
                "limit": limit or DEFAULT_LIMIT,
            }
            if page is not None:
                kwargs["page"] = page

            response = await self.client.documents.list(**kwargs)
            documents = response.memories if hasattr(response, "memories") else []
            pagination = response.pagination if hasattr(response, "pagination") else None

            return DocumentListResult(
                success=True,
                documents=documents,
                pagination=pagination,
            )
        except (OSError, ConnectionError) as network_error:
            return DocumentListResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return DocumentListResult(
                success=False,
                error=f"Document list failed: {error}",
            )

    async def document_delete(self, document_id: str) -> DocumentDeleteResult:
        """Delete a document by ID."""
        try:
            await self.client.documents.delete(document_id)
            return DocumentDeleteResult(
                success=True,
                message=f"Document {document_id} deleted successfully",
            )
        except (OSError, ConnectionError) as network_error:
            return DocumentDeleteResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return DocumentDeleteResult(
                success=False,
                error=f"Document delete failed: {error}",
            )

    async def document_add(
        self,
        content: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
    ) -> DocumentAddResult:
        """Add a document for processing."""
        try:
            metadata: Dict[str, str] = {}
            if title:
                metadata["title"] = title
            if description:
                metadata["description"] = description

            kwargs: Dict[str, Any] = {
                "content": content,
                "container_tags": self.container_tags,
            }
            if metadata:
                kwargs["metadata"] = metadata

            response = await self.client.documents.add(**kwargs)
            return DocumentAddResult(
                success=True,
                document=response.model_dump(),
            )
        except (OSError, ConnectionError) as network_error:
            return DocumentAddResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return DocumentAddResult(
                success=False,
                error=f"Document add failed: {error}",
            )

    async def memory_forget(
        self,
        container_tag: Optional[str] = None,
        memory_id: Optional[str] = None,
        memory_content: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> MemoryForgetResult:
        """Forget a memory by ID or content match."""
        if not memory_id and not memory_content:
            return MemoryForgetResult(
                success=False,
                error="Either memory_id or memory_content must be provided",
            )

        try:
            await forget_memory_request(
                api_key=self.api_key,
                container_tag=self._primary_container_tag(container_tag),
                memory_id=memory_id,
                memory_content=memory_content,
                reason=reason,
                base_url=self.base_url,
            )
            return MemoryForgetResult(
                success=True,
                message="Memory forgotten successfully",
            )
        except (OSError, ConnectionError) as network_error:
            return MemoryForgetResult(
                success=False,
                error=f"Network error: {network_error}",
            )
        except Exception as error:
            return MemoryForgetResult(
                success=False,
                error=f"Memory forget failed: {error}",
            )


def create_supermemory_tools(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> SupermemoryTools:
    """Helper function to create SupermemoryTools instance."""
    return SupermemoryTools(api_key, config)


def get_memory_tool_definitions() -> List[ChatCompletionFunctionToolParam]:
    """Get OpenAI function definitions for memory tools."""
    return _all_tool_definitions()


async def execute_memory_tool_calls(
    api_key: str,
    tool_calls: List[ChatCompletionMessageToolCall],
    config: Optional[SupermemoryToolsConfig] = None,
) -> List[ChatCompletionToolMessageParam]:
    """Execute tool calls from OpenAI function calling."""
    tools = SupermemoryTools(api_key, config)

    async def execute_single_call(
        tool_call: ChatCompletionMessageToolCall,
    ) -> ChatCompletionToolMessageParam:
        result = await tools.execute_tool_call(tool_call)
        return ChatCompletionToolMessageParam(
            tool_call_id=tool_call.id,
            role="tool",
            content=result,
        )

    import asyncio

    results = await asyncio.gather(
        *[execute_single_call(tool_call) for tool_call in tool_calls]
    )

    return results


class SearchMemoriesTool:
    """Individual search memories tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = _tool_definition("search_memories")

    async def execute(
        self,
        information_to_get: str,
        include_full_docs: bool = DEFAULT_INCLUDE_FULL_DOCS,
        limit: int = DEFAULT_LIMIT,
    ) -> MemorySearchResult:
        """Execute search memories."""
        return await self.tools.search_memories(
            information_to_get=information_to_get,
            include_full_docs=include_full_docs,
            limit=limit,
        )


class AddMemoryTool:
    """Individual add memory tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = _tool_definition("add_memory")

    async def execute(self, memory: str) -> MemoryAddResult:
        """Execute add memory."""
        return await self.tools.add_memory(memory=memory)


class GetProfileTool:
    """Individual get profile tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = _tool_definition("get_profile")

    async def execute(
        self,
        container_tag: Optional[str] = None,
        query: Optional[str] = None,
    ) -> ProfileResult:
        """Execute get profile."""
        return await self.tools.get_profile(container_tag=container_tag, query=query)


class DocumentListTool:
    """Individual document list tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = _tool_definition("document_list")

    async def execute(
        self,
        container_tag: Optional[str] = None,
        limit: Optional[int] = None,
        page: Optional[int] = None,
    ) -> DocumentListResult:
        """Execute document list."""
        return await self.tools.document_list(
            container_tag=container_tag,
            limit=limit,
            page=page,
        )


class DocumentDeleteTool:
    """Individual document delete tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = _tool_definition("document_delete")

    async def execute(self, document_id: str) -> DocumentDeleteResult:
        """Execute document delete."""
        return await self.tools.document_delete(document_id=document_id)


class DocumentAddTool:
    """Individual document add tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = _tool_definition("document_add")

    async def execute(
        self,
        content: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
    ) -> DocumentAddResult:
        """Execute document add."""
        return await self.tools.document_add(
            content=content,
            title=title,
            description=description,
        )


class MemoryForgetTool:
    """Individual memory forget tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = _tool_definition("memory_forget")

    async def execute(
        self,
        container_tag: Optional[str] = None,
        memory_id: Optional[str] = None,
        memory_content: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> MemoryForgetResult:
        """Execute memory forget."""
        return await self.tools.memory_forget(
            container_tag=container_tag,
            memory_id=memory_id,
            memory_content=memory_content,
            reason=reason,
        )


def create_search_memories_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> SearchMemoriesTool:
    """Create individual search memories tool."""
    return SearchMemoriesTool(api_key, config)


def create_add_memory_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> AddMemoryTool:
    """Create individual add memory tool."""
    return AddMemoryTool(api_key, config)


def create_get_profile_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> GetProfileTool:
    """Create individual get profile tool."""
    return GetProfileTool(api_key, config)


def create_document_list_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> DocumentListTool:
    """Create individual document list tool."""
    return DocumentListTool(api_key, config)


def create_document_delete_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> DocumentDeleteTool:
    """Create individual document delete tool."""
    return DocumentDeleteTool(api_key, config)


def create_document_add_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> DocumentAddTool:
    """Create individual document add tool."""
    return DocumentAddTool(api_key, config)


def create_memory_forget_tool(
    api_key: str, config: Optional[SupermemoryToolsConfig] = None
) -> MemoryForgetTool:
    """Create individual memory forget tool."""
    return MemoryForgetTool(api_key, config)
