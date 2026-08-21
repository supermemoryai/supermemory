"""Supermemory tools for OpenAI function calling."""

import json
import warnings
from typing import Any, Dict, List, Optional, TypedDict

import supermemory
from openai.types.chat import (
    ChatCompletionFunctionToolParam,
    ChatCompletionMessageToolCall,
    ChatCompletionToolMessageParam,
    ChatCompletionToolParam,
)
from openai.types.shared_params import FunctionDefinition
from supermemory.types import AddResponse, SearchMemoriesResponse

from .exceptions import SupermemoryConfigurationError

TOOL_DESCRIPTIONS = {
    "search_memories": (
        "Search stored memories and source chunks for relevant facts, preferences, "
        "history, and context. Use proactively whenever prior context could help. "
        "Hybrid results may contain either a memory or a source chunk; only an ID "
        "from a result containing a memory can be passed to memory_forget."
    ),
    "add_memory": (
        "Add (remember) memories/details/information about the user or other facts or entities. "
        "Run when explicitly asked or when the user mentions any information generalizable beyond "
        "the context of the current conversation."
    ),
    "get_profile": (
        "Get user profile containing static memories (permanent facts) and dynamic memories "
        "(recent context). Optionally include query-relevant search results. Static and dynamic "
        "profile entries are text; only memory entries in search results have forgettable IDs."
    ),
    "document_list": (
        "List stored source documents (conversations, URLs, files, pasted text) with pagination. "
        "Returns document metadata and summaries, including IDs for document_delete. "
        "It does not return full source content or memory IDs."
    ),
    "document_delete": (
        "Permanently delete a stored source document and soft-forget memories extracted from it. "
        "Use a document ID from document_list when the user wants to remove an entire source. "
        "Deletion is refused for documents outside the configured scope, shared with another "
        "scope, or still processing. Use memory_forget to remove one learned fact."
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
        "profile or search. This does not delete source documents. Provide a memory_id from a "
        "search result containing a memory, or memory_content for an exact text match. Use "
        "document_delete to remove an entire source."
    ),
}

PARAMETER_DESCRIPTIONS = {
    "information_to_get": (
        "What to look up in memory — keywords from the user's message, topic, entity names, or "
        "question phrasing. Search even when the user did not explicitly ask you to recall."
    ),
    "limit": "Maximum number of results to return",
    "memory": (
        "The text content of the memory to add. This should be a single sentence or a short paragraph."
    ),
    "query": "Optional search query to include relevant search results",
    "page": "Page number to fetch, 1-based (default: 1)",
    "document_id": (
        "Document ID from document_list. Permanently deletes the source and soft-forgets its "
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
        "Memory entry ID from a search_memories result containing a memory. Chunk and document "
        "IDs are invalid."
    ),
    "memory_content": (
        "Exact text of the profile memory to forget (alternative to memory_id). Must match "
        "precisely; if unsure, search first and use memory_id."
    ),
    "reason": "Optional reason recorded when forgetting (e.g. outdated, user correction)",
}

DEFAULT_LIMIT = 10
DEFAULT_CHUNK_THRESHOLD = 0.6

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
    The first container tag is used for single-space operations. All configured
    tags are applied to additions and define the allowed document-delete scope.
    """

    base_url: Optional[str]
    container_tags: Optional[List[str]]
    project_id: Optional[str]


# Type alias retained for compatibility with earlier releases.
MemoryObject = AddResponse


class MemorySearchResult(TypedDict, total=False):
    """Result type for memory search operations."""

    success: bool
    results: Optional[List[Dict[str, object]]]
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
    profile: Optional[Dict[str, object]]
    search_results: Optional[Dict[str, object]]
    error: Optional[str]


class DocumentListResult(TypedDict, total=False):
    """Result type for document list operations."""

    success: bool
    documents: Optional[List[Dict[str, object]]]
    pagination: Optional[Dict[str, object]]
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
MEMORY_TOOL_SCHEMAS: Dict[str, FunctionDefinition] = {
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
                "limit": {
                    "type": "integer",
                    "description": PARAMETER_DESCRIPTIONS["limit"],
                    "default": DEFAULT_LIMIT,
                    "minimum": 1,
                    "maximum": 100,
                },
            },
            "required": ["information_to_get"],
            "additionalProperties": False,
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
            "additionalProperties": False,
        },
    },
    "get_profile": {
        "name": "get_profile",
        "description": TOOL_DESCRIPTIONS["get_profile"],
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": PARAMETER_DESCRIPTIONS["query"],
                },
            },
            "required": [],
            "additionalProperties": False,
        },
    },
    "document_list": {
        "name": "document_list",
        "description": TOOL_DESCRIPTIONS["document_list"],
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": PARAMETER_DESCRIPTIONS["limit"],
                    "default": DEFAULT_LIMIT,
                    "minimum": 1,
                    "maximum": 1100,
                },
                "page": {
                    "type": "integer",
                    "description": PARAMETER_DESCRIPTIONS["page"],
                    "default": 1,
                    "minimum": 1,
                },
            },
            "required": [],
            "additionalProperties": False,
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
            "additionalProperties": False,
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
            "additionalProperties": False,
        },
    },
    "memory_forget": {
        "name": "memory_forget",
        "description": TOOL_DESCRIPTIONS["memory_forget"],
        "parameters": {
            "type": "object",
            "properties": {
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
            "additionalProperties": False,
        },
    },
}


def _resolve_container_tags(config: SupermemoryToolsConfig) -> List[str]:
    project_id = config.get("project_id")
    configured_tags = config.get("container_tags")

    if project_id is not None and configured_tags is not None:
        raise SupermemoryConfigurationError(
            "Supermemory tools config accepts either project_id or container_tags, not both."
        )
    if project_id:
        return [f"sm_project_{project_id}"]
    if configured_tags is not None:
        if not configured_tags or any(not tag for tag in configured_tags):
            raise SupermemoryConfigurationError(
                "container_tags must contain at least one non-empty tag."
            )
        return list(configured_tags)
    return ["sm_project_default"]


def _tool_definition(name: str) -> ChatCompletionToolParam:
    return {"type": "function", "function": MEMORY_TOOL_SCHEMAS[name]}


def _model_to_dict(value: Any) -> Dict[str, object]:
    """Normalize generated SDK models and already-plain response values."""
    if isinstance(value, dict):
        return dict(value)

    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        dumped = model_dump()
        if isinstance(dumped, dict):
            return dumped

    raise TypeError(f"Unsupported SDK response type: {type(value).__name__}")


def _all_tool_definitions() -> List[ChatCompletionFunctionToolParam]:
    return [
        {"type": "function", "function": MEMORY_TOOL_SCHEMAS[name]}
        for name in ALL_TOOL_NAMES
    ]


class SupermemoryTools:
    """Create memory tool handlers for OpenAI function calling."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        """Initialize SupermemoryTools.

        Args:
            api_key: Supermemory API key
            config: Optional configuration
        """
        config = config or {}
        base_url = config.get("base_url")
        if base_url:
            self.client = supermemory.AsyncSupermemory(
                api_key=api_key,
                base_url=base_url,
            )
        else:
            self.client = supermemory.AsyncSupermemory(api_key=api_key)
        self.container_tags = _resolve_container_tags(config)

    def _primary_container_tag(self) -> str:
        return self.container_tags[0]

    def get_tool_definitions(self) -> List[ChatCompletionFunctionToolParam]:
        """Get OpenAI function definitions for all memory tools."""
        return _all_tool_definitions()

    async def execute_tool_call(self, tool_call: ChatCompletionMessageToolCall) -> str:
        """Execute a tool call based on the function name and arguments."""
        function_name = tool_call.function.name
        handlers: Dict[str, Any] = {
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
            try:
                args = json.loads(tool_call.function.arguments)
            except (json.JSONDecodeError, TypeError):
                return json.dumps({"success": False, "error": "Invalid tool arguments"})

            if not isinstance(args, dict):
                return json.dumps({"success": False, "error": "Invalid tool arguments"})

            parameters = MEMORY_TOOL_SCHEMAS[function_name]["parameters"] or {}
            properties = parameters.get("properties", {})
            required = parameters.get("required", [])
            if not isinstance(properties, dict) or not isinstance(required, list):
                return json.dumps({"success": False, "error": "Invalid tool arguments"})

            required_names = {name for name in required if isinstance(name, str)}
            if set(args) - set(properties) or required_names - set(args):
                return json.dumps({"success": False, "error": "Invalid tool arguments"})

            result = await handler(**args)

        return json.dumps(result)

    async def search_memories(
        self,
        information_to_get: str,
        include_full_docs: Optional[bool] = None,
        limit: int = DEFAULT_LIMIT,
    ) -> MemorySearchResult:
        """Search memories.

        ``include_full_docs`` remains a deprecated Python-only argument for
        source compatibility. V4 search cannot return full source documents.
        """
        if include_full_docs is not None:
            warnings.warn(
                "include_full_docs is deprecated and ignored because v4 search "
                "does not return full source documents",
                DeprecationWarning,
                stacklevel=2,
            )

        try:
            response: SearchMemoriesResponse = await self.client.search.memories(
                q=information_to_get,
                container_tag=self._primary_container_tag(),
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
        query: Optional[str] = None,
    ) -> ProfileResult:
        """Get user profile with optional query-scoped search results."""
        try:
            if query:
                response = await self.client.profile(
                    container_tag=self._primary_container_tag(),
                    q=query,
                )
            else:
                response = await self.client.profile(
                    container_tag=self._primary_container_tag(),
                )

            return ProfileResult(
                success=True,
                profile=_model_to_dict(response.profile),
                search_results=(
                    _model_to_dict(response.search_results)
                    if response.search_results is not None
                    else None
                ),
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
        limit: Optional[int] = None,
        page: Optional[int] = None,
    ) -> DocumentListResult:
        """List stored documents."""
        try:
            kwargs: Dict[str, Any] = {
                "container_tags": [self._primary_container_tag()],
                "limit": DEFAULT_LIMIT if limit is None else limit,
            }
            if page is not None:
                kwargs["page"] = page

            response = await self.client.documents.list(**kwargs)

            return DocumentListResult(
                success=True,
                documents=[_model_to_dict(document) for document in response.memories],
                pagination=_model_to_dict(response.pagination),
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
            # The delete endpoint has no container-tag argument. Resolve custom IDs
            # first and refuse documents whose complete tag set is not configured.
            document = await self.client.documents.get(document_id)
            document_tags = set(document.container_tags or [])
            configured_tags = set(self.container_tags)

            if not document_tags or not document_tags.issubset(configured_tags):
                return DocumentDeleteResult(
                    success=False,
                    error="Document is outside configured scope",
                )

            await self.client.documents.delete(document.id)
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
            kwargs: Dict[str, Any] = {
                "container_tag": self._primary_container_tag(),
            }
            if memory_id:
                kwargs["id"] = memory_id
            if memory_content:
                kwargs["content"] = memory_content
            if reason:
                kwargs["reason"] = reason

            await self.client.memories.forget(**kwargs)
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
        include_full_docs: Optional[bool] = None,
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
        query: Optional[str] = None,
    ) -> ProfileResult:
        """Execute get profile."""
        return await self.tools.get_profile(query=query)


class DocumentListTool:
    """Individual document list tool."""

    def __init__(self, api_key: str, config: Optional[SupermemoryToolsConfig] = None):
        self.tools = SupermemoryTools(api_key, config)
        self.definition: ChatCompletionToolParam = _tool_definition("document_list")

    async def execute(
        self,
        limit: Optional[int] = None,
        page: Optional[int] = None,
    ) -> DocumentListResult:
        """Execute document list."""
        return await self.tools.document_list(
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
        memory_id: Optional[str] = None,
        memory_content: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> MemoryForgetResult:
        """Execute memory forget."""
        return await self.tools.memory_forget(
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
