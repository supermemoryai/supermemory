"""HTTP server for Python SDK chat integrations in the playground."""

import asyncio
import hashlib
import json
import os
import re
import time
from pathlib import Path
from typing import Annotated, Any, Literal, Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, SecretStr, model_validator
from starlette.middleware.trustedhost import TrustedHostMiddleware

_root = Path(__file__).resolve().parent
load_dotenv(_root / ".env")
load_dotenv(_root.parent / ".env.local")
load_dotenv(_root.parent / ".env")

DEFAULT_SUPERMEMORY_BASE_URL = "https://api.supermemory.ai"
HTTP_TIMEOUT_SECONDS = 60.0
CHAT_TIMEOUT_SECONDS = 115.0
CONTEXT_DEBUG_TIMEOUT_SECONDS = 10.0
DIRECT_SAVE_TIMEOUT_SECONDS = 10.0
MAX_OUTPUT_TOKENS = 2_048
MAX_MESSAGE_LENGTH = 20_000
MAX_MESSAGES = 64
MAX_TOTAL_MESSAGE_LENGTH = 100_000
MAX_API_KEY_LENGTH = 1_024
MAX_CONTAINER_TAG_LENGTH = 100
MAX_CONVERSATION_ID_LENGTH = 242
CONTAINER_TAG_PATTERN = r"^[a-zA-Z0-9_:-]+$"

TOOLS_SYSTEM_PROMPT = """You are a helpful assistant with Supermemory long-term memory.

You have tools to manage memory. Use them proactively:
- search_memories: hybrid recall — search before answering whenever user-specific context could help (do not wait to be asked)
- get_profile: broad static/dynamic user context at conversation start or when you need a wide overview
- add_memory: store a new generalizable fact
- document_list / document_add / document_delete: manage source documents
- memory_forget: soft-delete one profile fact (not whole documents)

Before answering questions about the user, their preferences, or past context, search memories or get profile first. When the user asks you to remember something, use add_memory."""

app = FastAPI(title="SDK Playground Python Chat")
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["127.0.0.1", "localhost"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(max_length=MAX_MESSAGE_LENGTH)


class MiddlewareConfig(BaseModel):
    addMemory: Literal["always", "never"] = "always"
    verbose: bool = False


class PlaygroundInputError(ValueError):
    """A request value is missing after transport-level validation."""


class SupermemoryApiKeys(BaseModel):
    supermemoryApiKey: SecretStr = Field(max_length=MAX_API_KEY_LENGTH)


class ApiKeys(SupermemoryApiKeys):
    openaiApiKey: SecretStr = Field(max_length=MAX_API_KEY_LENGTH)


class ChatRequest(BaseModel):
    sdkId: Literal[
        "py-openai-middleware",
        "py-openai-tools",
        "py-supermemory-direct",
    ]
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)
    containerTag: str = Field(
        default="sdk-playground",
        min_length=1,
        max_length=MAX_CONTAINER_TAG_LENGTH,
        pattern=CONTAINER_TAG_PATTERN,
    )
    conversationId: str = Field(
        min_length=1,
        max_length=MAX_CONVERSATION_ID_LENGTH,
    )
    memoryMode: Optional[Literal["profile", "query", "full"]] = "full"
    middlewareConfig: Optional[MiddlewareConfig] = None
    apiKeys: Optional[ApiKeys] = None

    @model_validator(mode="after")
    def require_user_message(self) -> "ChatRequest":
        if not any(
            message.role == "user" and message.content.strip()
            for message in self.messages
        ):
            raise ValueError("messages must include a non-empty user message")
        if (
            sum(len(message.content) for message in self.messages)
            > MAX_TOTAL_MESSAGE_LENGTH
        ):
            raise ValueError(
                f"total message content cannot exceed {MAX_TOTAL_MESSAGE_LENGTH} characters"
            )
        return self


class ContextRequest(BaseModel):
    containerTag: str = Field(
        default="sdk-playground",
        min_length=1,
        max_length=MAX_CONTAINER_TAG_LENGTH,
        pattern=CONTAINER_TAG_PATTERN,
    )
    query: Optional[str] = Field(default=None, max_length=MAX_MESSAGE_LENGTH)
    apiKeys: Optional[SupermemoryApiKeys] = None


def model_name() -> str:
    return os.getenv("MODEL_NAME", "gpt-4o-mini")


def supplied_secret(value: Optional[SecretStr], label: str) -> str:
    secret = value.get_secret_value().strip() if value else ""
    if not secret:
        raise PlaygroundInputError(f"{label} must be supplied with the request")
    return secret


def resolve_supermemory_key(api_keys: Optional[SupermemoryApiKeys]) -> str:
    return supplied_secret(
        api_keys.supermemoryApiKey if api_keys else None,
        "Supermemory API key",
    )


def resolve_chat_keys(api_keys: Optional[ApiKeys]) -> tuple[str, str]:
    return (
        resolve_supermemory_key(api_keys),
        supplied_secret(api_keys.openaiApiKey if api_keys else None, "OpenAI API key"),
    )


def supermemory_base_url() -> str:
    configured = os.getenv("SUPERMEMORY_BASE_URL", "").strip()
    base_url = (configured or DEFAULT_SUPERMEMORY_BASE_URL).rstrip("/")
    parsed = urlparse(base_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise RuntimeError("SUPERMEMORY_BASE_URL must be an absolute HTTP(S) URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise RuntimeError(
            "SUPERMEMORY_BASE_URL cannot contain credentials, a query, or a fragment"
        )
    return base_url


def public_error(error: Exception, *secrets: str) -> str:
    message = str(error)
    for secret in secrets:
        if secret:
            message = message.replace(secret, "[redacted]")
    return message[:1_000]


async def chat_openai_middleware(
    messages: list[ChatMessage],
    container_tag: str,
    conversation_id: str,
    memory_mode: str,
    middleware_config: MiddlewareConfig,
    sm_key: str,
    oai_key: str,
) -> str:
    from openai import AsyncOpenAI
    from supermemory_openai import OpenAIMiddlewareOptions, with_supermemory

    client = with_supermemory(
        AsyncOpenAI(
            api_key=oai_key,
            timeout=HTTP_TIMEOUT_SECONDS,
            max_retries=1,
        ),
        OpenAIMiddlewareOptions(
            container_tag=container_tag,
            custom_id=conversation_id,
            mode=memory_mode,
            add_memory=middleware_config.addMemory,
            verbose=middleware_config.verbose,
            api_key=sm_key,
            base_url=supermemory_base_url(),
        ),
    )

    openai_messages = [m.model_dump() for m in messages]
    if not any(m.role == "system" for m in messages):
        openai_messages.insert(
            0,
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant with long-term memory about the user."
                ),
            },
        )

    response = await client.chat.completions.create(
        model=model_name(),
        messages=openai_messages,
        max_completion_tokens=MAX_OUTPUT_TOKENS,
    )
    return response.choices[0].message.content or ""


async def chat_openai_tools(
    messages: list[ChatMessage],
    container_tag: str,
    sm_key: str,
    oai_key: str,
) -> tuple[str, list[dict[str, Any]]]:
    from openai import AsyncOpenAI
    from supermemory_openai import SupermemoryTools, execute_memory_tool_calls

    openai_client = AsyncOpenAI(
        api_key=oai_key,
        timeout=HTTP_TIMEOUT_SECONDS,
        max_retries=1,
    )
    config: dict[str, Any] = {
        "base_url": supermemory_base_url(),
        "container_tags": [container_tag],
    }

    tools = SupermemoryTools(sm_key, config)
    tool_defs = tools.get_tool_definitions()
    trace: list[dict[str, Any]] = []

    convo: list[dict[str, Any]] = [
        {"role": "system", "content": TOOLS_SYSTEM_PROMPT},
        *[m.model_dump() for m in messages if m.role != "system"],
    ]

    for step in range(8):
        response = await openai_client.chat.completions.create(
            model=model_name(),
            messages=convo,
            tools=tool_defs,
            max_completion_tokens=MAX_OUTPUT_TOKENS,
        )
        message = response.choices[0].message
        convo.append(message.model_dump())

        if message.tool_calls:
            tool_messages = await execute_memory_tool_calls(
                sm_key,
                message.tool_calls,
                config,
            )
            for i, call in enumerate(message.tool_calls):
                raw = tool_messages[i]["content"]
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = raw
                trace.append(
                    {
                        "step": step + 1,
                        "toolName": call.function.name,
                        "args": json.loads(call.function.arguments),
                        "result": parsed,
                    }
                )
            convo.extend(tool_messages)
            continue

        return message.content or "", trace

    raise RuntimeError("Tool loop exceeded max steps")


def object_field(value: Any, name: str, default: Any = None) -> Any:
    if isinstance(value, dict):
        return value.get(name, default)
    return getattr(value, name, default)


def list_field(value: Any, name: str) -> list[Any]:
    result = object_field(value, name, [])
    return result if isinstance(result, list) else []


def extract_profile_context(profile_response: Any) -> dict[str, list[Any]]:
    profile = object_field(profile_response, "profile", {}) or {}
    search_results = object_field(profile_response, "search_results", None)
    if search_results is None and isinstance(profile_response, dict):
        search_results = profile_response.get("searchResults")

    if isinstance(search_results, list):
        search_list = search_results
    else:
        search_list = list_field(search_results, "results")

    return {
        "static": list_field(profile, "static"),
        "dynamic": list_field(profile, "dynamic"),
        "searchResults": search_list,
    }


def display_context_item(item: Any) -> str:
    if hasattr(item, "model_dump"):
        return json.dumps(item.model_dump(mode="json"), ensure_ascii=False)
    if isinstance(item, dict):
        return json.dumps(item, ensure_ascii=False)
    return str(item)


def direct_conversation_custom_id(conversation_id: str) -> str:
    readable = re.sub(r"[^A-Za-z0-9._-]+", "-", conversation_id).strip("-._")
    readable = readable[:40] or "session"
    digest = hashlib.sha256(conversation_id.encode("utf-8")).hexdigest()[:12]
    return f"sdk-playground-direct-{readable}-{digest}"


def conversation_transcript(messages: list[ChatMessage], assistant_text: str) -> str:
    transcript = [
        f"{message.role.capitalize()}: {message.content}"
        for message in messages
        if message.role != "system"
    ]
    transcript.append(f"Assistant: {assistant_text or '(empty response)'}")
    return "\n\n".join(transcript)


async def fetch_profile_context(
    container_tag: str,
    sm_key: str,
    query: Optional[str] = None,
    *,
    include: Optional[list[str]] = None,
) -> dict[str, list[Any]]:
    from supermemory import AsyncSupermemory

    client = AsyncSupermemory(
        api_key=sm_key,
        base_url=supermemory_base_url(),
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    request: dict[str, Any] = {"container_tag": container_tag}
    if query:
        request["q"] = query
    if include is not None:
        request["include"] = include
    profile_response = await client.profile(**request)
    return extract_profile_context(profile_response)


async def chat_supermemory_direct(
    messages: list[ChatMessage],
    container_tag: str,
    conversation_id: str,
    sm_key: str,
    oai_key: str,
) -> tuple[str, str, dict[str, list[Any]]]:
    """Manual pattern: profile() for context, then OpenAI, then add() conversation."""
    from openai import AsyncOpenAI
    from supermemory import AsyncSupermemory

    sm_client = AsyncSupermemory(
        api_key=sm_key,
        base_url=supermemory_base_url(),
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    openai_client = AsyncOpenAI(
        api_key=oai_key,
        timeout=HTTP_TIMEOUT_SECONDS,
        max_retries=1,
    )

    user_messages = [m for m in messages if m.role == "user"]
    last_user = user_messages[-1].content if user_messages else ""

    profile_response = await sm_client.profile(
        container_tag=container_tag,
        **({"q": last_user} if last_user else {}),
    )
    profile_context = extract_profile_context(profile_response)
    context = "\n".join(
        (
            "Profile static: "
            + ", ".join(map(display_context_item, profile_context["static"])),
            "Profile dynamic: "
            + ", ".join(map(display_context_item, profile_context["dynamic"])),
            "Relevant search results: "
            + ", ".join(map(display_context_item, profile_context["searchResults"])),
        )
    )

    openai_messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": f"You are a helpful assistant. User context:\n{context}",
        },
        *[m.model_dump() for m in messages if m.role != "system"],
    ]

    response = await openai_client.chat.completions.create(
        model=model_name(),
        messages=openai_messages,
        max_completion_tokens=MAX_OUTPUT_TOKENS,
    )
    assistant_text = response.choices[0].message.content or ""

    custom_id = direct_conversation_custom_id(conversation_id)
    return assistant_text, custom_id, profile_context


async def save_direct_conversation(
    messages: list[ChatMessage],
    assistant_text: str,
    container_tag: str,
    custom_id: str,
    sm_key: str,
) -> dict[str, Any]:
    from supermemory import AsyncSupermemory

    try:
        client = AsyncSupermemory(
            api_key=sm_key,
            base_url=supermemory_base_url(),
            timeout=DIRECT_SAVE_TIMEOUT_SECONDS,
        )
        async with asyncio.timeout(DIRECT_SAVE_TIMEOUT_SECONDS):
            response = await client.add(
                content=conversation_transcript(messages, assistant_text),
                container_tag=container_tag,
                custom_id=custom_id,
            )
        return {
            "type": "conversation_save_accepted",
            "label": "Full conversation accepted for processing",
            "detail": {
                "nonFatal": True,
                "containerTag": container_tag,
                "customId": custom_id,
                "documentId": object_field(response, "id"),
                "status": object_field(response, "status"),
            },
        }
    except Exception as error:
        return {
            "type": "conversation_save_failed",
            "label": "Conversation save unavailable",
            "detail": {
                "nonFatal": True,
                "containerTag": container_tag,
                "customId": custom_id,
                "error": public_error(error, sm_key),
            },
        }


async def fetch_container_context(
    container_tag: str,
    sm_key: str,
    query: Optional[str] = None,
) -> dict[str, Any]:
    if not sm_key:
        raise RuntimeError("Supermemory API key must be supplied")

    profile_context = await fetch_profile_context(container_tag, sm_key, query)
    base_url = supermemory_base_url()

    import httpx

    async with httpx.AsyncClient(
        timeout=HTTP_TIMEOUT_SECONDS,
        follow_redirects=False,
    ) as http:
        docs_response = await http.post(
            f"{base_url}/v3/documents/documents",
            headers={
                "Authorization": f"Bearer {sm_key}",
                "Content-Type": "application/json",
            },
            json={
                "containerTags": [container_tag],
                "limit": 25,
                "sort": "createdAt",
                "order": "desc",
            },
        )
        docs_response.raise_for_status()
        docs = docs_response.json()

    raw_documents = docs.get("documents", []) if isinstance(docs, dict) else []

    documents = []
    for doc in raw_documents:
        record = doc if isinstance(doc, dict) else getattr(doc, "__dict__", {})
        memory_entries = (
            record.get("memoryEntries") or record.get("memory_entries") or []
        )
        if not memory_entries and isinstance(record.get("memories"), list):
            nested = record.get("memories") or []
            if nested and isinstance(nested[0], dict) and nested[0].get("memory"):
                memory_entries = nested
        documents.append(
            {
                "id": record.get("id"),
                "title": record.get("title"),
                "status": record.get("status"),
                "customId": record.get("customId") or record.get("custom_id"),
                "createdAt": record.get("createdAt") or record.get("created_at"),
                "updatedAt": record.get("updatedAt") or record.get("updated_at"),
                "summary": record.get("summary"),
                "memoryEntries": memory_entries,
            }
        )

    return {
        "containerTag": container_tag,
        "query": query,
        "profile": profile_context,
        "documents": documents,
        "pagination": docs.get("pagination") if isinstance(docs, dict) else None,
    }


def reconstruct_python_sdk_memory_block(
    memory_mode: str,
    profile: dict[str, Any],
) -> tuple[dict[str, list[str]], str]:
    from supermemory_openai import convert_profile_to_markdown, deduplicate_memories
    from supermemory_openai.utils import wrap_memory_context

    deduplicated = deduplicate_memories(
        static=profile.get("static", []) if memory_mode != "query" else [],
        dynamic=profile.get("dynamic", []) if memory_mode != "query" else [],
        search_results=profile.get("searchResults", []),
    )
    visible_profile = {
        "static": deduplicated.static,
        "dynamic": deduplicated.dynamic,
        "searchResults": (
            [] if memory_mode == "profile" else deduplicated.search_results
        ),
    }

    profile_data = ""
    if memory_mode != "query":
        profile_data = convert_profile_to_markdown(
            {
                "profile": {
                    "static": visible_profile["static"],
                    "dynamic": visible_profile["dynamic"],
                },
                "searchResults": {"results": []},
            }
        )

    search_results_memories = ""
    if memory_mode != "profile" and visible_profile["searchResults"]:
        search_results_memories = (
            "Search results for user's recent message: \n"
            + "\n".join(f"- {memory}" for memory in visible_profile["searchResults"])
        )

    memories = f"{profile_data}\n{search_results_memories}".strip()
    return visible_profile, wrap_memory_context(memories)


def build_middleware_memory_debug(
    container_tag: str,
    conversation_id: str,
    memory_mode: str,
    last_user_message: str,
    context: Optional[dict[str, Any]],
    context_error: Optional[str],
    middleware_config: MiddlewareConfig,
) -> list[dict[str, Any]]:
    debug: list[dict[str, Any]] = []
    if context is None:
        debug.append(
            {
                "type": "context_debug_unavailable",
                "label": "Post-response context snapshot unavailable",
                "detail": {"error": context_error or "Unknown context error"},
            }
        )
    else:
        raw_profile = context["profile"]
        profile, memory_block = reconstruct_python_sdk_memory_block(
            memory_mode,
            raw_profile,
        )

        debug.extend(
            (
                {
                    "type": "profile_fetch",
                    "label": "Post-response context reconstruction",
                    "detail": {
                        "authoritativeMiddlewareCapture": False,
                        "timing": "after model response",
                        "endpoint": "POST /v4/profile",
                        "containerTag": container_tag,
                        "customId": conversation_id,
                        "memoryMode": memory_mode,
                        "query": context.get("query"),
                        "staticCount": len(profile.get("static", [])),
                        "dynamicCount": len(profile.get("dynamic", [])),
                        "searchResultCount": len(profile.get("searchResults", [])),
                    },
                },
                {
                    "type": "context_preview",
                    "label": (
                        "Reconstructed SDK-owned memory block "
                        "(not middleware capture)"
                    ),
                    "preview": memory_block,
                    "detail": {
                        "totalFacts": (
                            len(profile.get("static", []))
                            + len(profile.get("dynamic", []))
                            + len(profile.get("searchResults", []))
                        ),
                        "fullLength": len(memory_block),
                    },
                },
            )
        )

    save_detail = {
        "containerTag": container_tag,
        "customId": f"conversation:{conversation_id}",
        "addMemory": middleware_config.addMemory,
        "verbose": middleware_config.verbose,
    }
    if middleware_config.addMemory == "always" and last_user_message.strip():
        debug.append(
            {
                "type": "conversation_save_queued",
                "label": "Conversation save queued by middleware",
                "detail": save_detail,
            }
        )
    else:
        debug.append(
            {
                "type": "conversation_save_skipped",
                "label": "Conversation save disabled",
                "detail": save_detail,
            }
        )
    return debug


async def fetch_context_for_debug(
    container_tag: str,
    query: Optional[str],
    sm_key: str,
) -> tuple[Optional[dict[str, Any]], Optional[str]]:
    try:
        async with asyncio.timeout(CONTEXT_DEBUG_TIMEOUT_SECONDS):
            profile = await fetch_profile_context(
                container_tag,
                sm_key,
                query,
                include=["static", "dynamic"],
            )
            return (
                {
                    "containerTag": container_tag,
                    "query": query,
                    "profile": profile,
                },
                None,
            )
    except Exception as error:
        return None, public_error(error, sm_key)


@app.get("/context")
async def context_get(
    containerTag: Annotated[
        str,
        Query(
            min_length=1,
            max_length=MAX_CONTAINER_TAG_LENGTH,
            pattern=CONTAINER_TAG_PATTERN,
        ),
    ] = "sdk-playground",
    query: Annotated[Optional[str], Query(max_length=MAX_MESSAGE_LENGTH)] = None,
    x_supermemory_api_key: Annotated[
        Optional[str],
        Header(alias="X-Supermemory-API-Key"),
    ] = None,
):
    sm_key = ""
    try:
        sm_key = supplied_secret(
            SecretStr(x_supermemory_api_key) if x_supermemory_api_key else None,
            "X-Supermemory-API-Key header",
        )
        async with asyncio.timeout(HTTP_TIMEOUT_SECONDS):
            ctx = await fetch_container_context(containerTag, sm_key, query)
        return {"ok": True, "context": ctx}
    except Exception as error:
        return JSONResponse(
            status_code=(
                504
                if isinstance(error, TimeoutError)
                else 400 if isinstance(error, PlaygroundInputError) else 500
            ),
            content={"ok": False, "error": public_error(error, sm_key)},
        )


@app.post("/context")
async def context_post(req: ContextRequest):
    sm_key = ""
    try:
        sm_key = resolve_supermemory_key(req.apiKeys)
        async with asyncio.timeout(HTTP_TIMEOUT_SECONDS):
            ctx = await fetch_container_context(req.containerTag, sm_key, req.query)
        return {"ok": True, "context": ctx}
    except Exception as error:
        return JSONResponse(
            status_code=(
                504
                if isinstance(error, TimeoutError)
                else 400 if isinstance(error, PlaygroundInputError) else 500
            ),
            content={"ok": False, "error": public_error(error, sm_key)},
        )


@app.get("/health")
async def health():
    return {
        "ok": True,
        "playground": "sdk-playground",
        "requiresRequestKeys": True,
        "model": model_name(),
        "sdks": [
            "py-openai-middleware",
            "py-openai-tools",
            "py-supermemory-direct",
        ],
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    started = time.time()
    sm_key = ""
    oai_key = ""
    try:
        sm_key, oai_key = resolve_chat_keys(req.apiKeys)
        tool_trace: list[dict[str, Any]] = []
        memory_debug: list[dict[str, Any]] = []
        middleware_debug: Optional[tuple[MiddlewareConfig, str, Optional[str]]] = None
        direct_debug: Optional[tuple[str, dict[str, list[Any]], str]] = None
        async with asyncio.timeout(CHAT_TIMEOUT_SECONDS):
            if req.sdkId == "py-openai-middleware":
                middleware_config = req.middlewareConfig or MiddlewareConfig()
                text = await chat_openai_middleware(
                    req.messages,
                    req.containerTag,
                    req.conversationId,
                    req.memoryMode or "full",
                    middleware_config,
                    sm_key,
                    oai_key,
                )
                last_user = next(
                    (m.content for m in reversed(req.messages) if m.role == "user"),
                    "",
                )
                query = last_user if req.memoryMode != "profile" else None
                middleware_debug = (middleware_config, last_user, query)
            elif req.sdkId == "py-openai-tools":
                text, tool_trace = await chat_openai_tools(
                    req.messages, req.containerTag, sm_key, oai_key
                )
            elif req.sdkId == "py-supermemory-direct":
                text, custom_id, profile_context = await chat_supermemory_direct(
                    req.messages,
                    req.containerTag,
                    req.conversationId,
                    sm_key,
                    oai_key,
                )
                last_user = next(
                    (m.content for m in reversed(req.messages) if m.role == "user"),
                    "",
                )
                direct_debug = (custom_id, profile_context, last_user)
            else:
                raise RuntimeError(f"Unsupported Python SDK: {req.sdkId}")

        if middleware_debug is not None:
            middleware_config, last_user, query = middleware_debug
            ctx, context_error = await fetch_context_for_debug(
                req.containerTag,
                query,
                sm_key,
            )
            memory_debug = build_middleware_memory_debug(
                req.containerTag,
                req.conversationId,
                req.memoryMode or "full",
                last_user,
                ctx,
                context_error,
                middleware_config,
            )
        elif direct_debug is not None:
            custom_id, profile_context, last_user = direct_debug
            save_debug = await save_direct_conversation(
                req.messages,
                text,
                req.containerTag,
                custom_id,
                sm_key,
            )
            memory_debug = [
                {
                    "type": "manual_profile",
                    "label": "Profile context used for this response",
                    "detail": {
                        "containerTag": req.containerTag,
                        "query": last_user,
                        "staticCount": len(profile_context["static"]),
                        "dynamicCount": len(profile_context["dynamic"]),
                        "searchResultCount": len(profile_context["searchResults"]),
                    },
                },
                save_debug,
            ]

        return {
            "ok": True,
            "sdkId": req.sdkId,
            "message": {"role": "assistant", "content": text},
            "toolTrace": tool_trace,
            "memoryDebug": memory_debug,
            "durationMs": int((time.time() - started) * 1000),
        }
    except TimeoutError:
        return JSONResponse(
            status_code=504,
            content={
                "ok": False,
                "sdkId": req.sdkId,
                "error": f"Python chat timed out after {int(CHAT_TIMEOUT_SECONDS)} seconds",
                "durationMs": int((time.time() - started) * 1000),
            },
        )
    except Exception as error:
        return JSONResponse(
            status_code=400 if isinstance(error, PlaygroundInputError) else 500,
            content={
                "ok": False,
                "sdkId": req.sdkId,
                "error": public_error(error, sm_key, oai_key),
                "durationMs": int((time.time() - started) * 1000),
            },
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SDK_PLAYGROUND_PYTHON_PORT", "8792"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
