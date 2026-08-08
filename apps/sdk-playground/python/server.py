"""HTTP server for Python SDK chat integrations in the playground."""

import json
import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

_root = Path(__file__).resolve().parent
load_dotenv(_root / ".env")
load_dotenv(_root.parent / ".env.local")
load_dotenv(_root.parent / ".env")

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
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class MiddlewareConfig(BaseModel):
    addMemory: Literal["always", "never"] = "always"
    verbose: bool = False


class ApiKeys(BaseModel):
    supermemoryApiKey: str
    openaiApiKey: str


class ChatRequest(BaseModel):
    sdkId: str
    messages: list[ChatMessage]
    containerTag: str = "sdk-playground"
    conversationId: str = "default-session"
    memoryMode: Optional[Literal["profile", "query", "full"]] = "full"
    middlewareConfig: Optional[MiddlewareConfig] = None
    apiKeys: Optional[ApiKeys] = None


class ContextRequest(BaseModel):
    containerTag: str = "sdk-playground"
    query: Optional[str] = None
    apiKeys: Optional[ApiKeys] = None


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is not set")
    return value


def model_name() -> str:
    return os.getenv("MODEL_NAME", "gpt-4o-mini")


def resolve_keys(api_keys: Optional[ApiKeys]) -> tuple[str, str]:
    if api_keys and api_keys.supermemoryApiKey.strip() and api_keys.openaiApiKey.strip():
        return api_keys.supermemoryApiKey.strip(), api_keys.openaiApiKey.strip()
    return require_env("SUPERMEMORY_API_KEY"), require_env("OPENAI_API_KEY")


@contextmanager
def playground_env_keys(sm_key: str, oai_key: str):
    previous = {
        "SUPERMEMORY_API_KEY": os.environ.get("SUPERMEMORY_API_KEY"),
        "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY"),
    }
    os.environ["SUPERMEMORY_API_KEY"] = sm_key
    os.environ["OPENAI_API_KEY"] = oai_key
    try:
        yield
    finally:
        for name, value in previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value


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

    with playground_env_keys(sm_key, oai_key):
        client = with_supermemory(
            AsyncOpenAI(api_key=oai_key),
            OpenAIMiddlewareOptions(
                container_tag=container_tag,
                custom_id=conversation_id,
                mode=memory_mode,
                add_memory=middleware_config.addMemory,
                verbose=middleware_config.verbose,
            ),
        )

        openai_messages = [m.model_dump() for m in messages]
        if not any(m.role == "system" for m in messages):
            openai_messages.insert(
                0,
                {
                    "role": "system",
                    "content": "You are a helpful assistant with long-term memory about the user.",
                },
            )

        response = await client.chat.completions.create(
            model=model_name(),
            messages=openai_messages,
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

    openai_client = AsyncOpenAI(api_key=oai_key)
    config: dict[str, Any] = {"container_tags": [container_tag]}
    if os.getenv("SUPERMEMORY_BASE_URL"):
        config["base_url"] = os.getenv("SUPERMEMORY_BASE_URL")

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


async def chat_supermemory_direct(
    messages: list[ChatMessage],
    container_tag: str,
    sm_key: str,
    oai_key: str,
) -> str:
    """Manual pattern: profile() for context, then OpenAI, then add() conversation."""
    from openai import AsyncOpenAI
    from supermemory import AsyncSupermemory

    sm_client = AsyncSupermemory(
        api_key=sm_key,
        **(
            {"base_url": os.getenv("SUPERMEMORY_BASE_URL")}
            if os.getenv("SUPERMEMORY_BASE_URL")
            else {}
        ),
    )
    openai_client = AsyncOpenAI(api_key=oai_key)

    user_messages = [m for m in messages if m.role == "user"]
    last_user = user_messages[-1].content if user_messages else ""

    profile = await sm_client.profile(
        container_tag=container_tag,
        **({"q": last_user} if last_user else {}),
    )

    static = getattr(profile, "profile", {}) or {}
    static_list = static.get("static", []) if isinstance(static, dict) else []
    dynamic_list = static.get("dynamic", []) if isinstance(static, dict) else []

    context = f"Profile static: {static_list}\nProfile dynamic: {dynamic_list}"

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
    )
    assistant_text = response.choices[0].message.content or ""

    await sm_client.add(
        content=f"User: {last_user}\nAssistant: {assistant_text}",
        container_tag=container_tag,
        custom_id="sdk-playground-direct",
    )

    return assistant_text


async def fetch_container_context(
    container_tag: str,
    query: Optional[str] = None,
    sm_key: Optional[str] = None,
) -> dict[str, Any]:
    from supermemory import AsyncSupermemory

    api_key = sm_key or require_env("SUPERMEMORY_API_KEY")

    client = AsyncSupermemory(
        api_key=api_key,
        **(
            {"base_url": os.getenv("SUPERMEMORY_BASE_URL")}
            if os.getenv("SUPERMEMORY_BASE_URL")
            else {}
        ),
    )

    profile_kwargs: dict[str, Any] = {"container_tag": container_tag}
    if query:
        profile_kwargs["q"] = query

    profile_response = await client.profile(**profile_kwargs)
    profile = getattr(profile_response, "profile", {}) or {}
    static = profile.get("static", []) if isinstance(profile, dict) else []
    dynamic = profile.get("dynamic", []) if isinstance(profile, dict) else []
    search_results = getattr(profile_response, "search_results", None)
    if isinstance(search_results, dict) and isinstance(search_results.get("results"), list):
        search_list = search_results["results"]
    elif isinstance(search_results, list):
        search_list = search_results
    else:
        search_list = []

    base_url = os.getenv("SUPERMEMORY_BASE_URL", "https://api.supermemory.ai").rstrip("/")

    import httpx

    async with httpx.AsyncClient(timeout=60.0) as http:
        docs_response = await http.post(
            f"{base_url}/v3/documents/documents",
            headers={
                "Authorization": f"Bearer {api_key}",
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
            record.get("memoryEntries")
            or record.get("memory_entries")
            or []
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
        "profile": {
            "static": static,
            "dynamic": dynamic,
            "searchResults": search_list,
        },
        "documents": documents,
        "pagination": docs.get("pagination") if isinstance(docs, dict) else None,
    }


def build_middleware_memory_debug(
    container_tag: str,
    conversation_id: str,
    memory_mode: str,
    last_user_message: str,
    context: dict[str, Any],
    middleware_config: MiddlewareConfig,
) -> list[dict[str, Any]]:
    profile = context["profile"]
    preview_lines = [f"[memory mode: {memory_mode}]"]
    if context.get("query"):
        preview_lines.append(f"[query: {context['query']}]")
    for label, items in (
        ("Static", profile.get("static", [])),
        ("Dynamic", profile.get("dynamic", [])),
        ("Search results", profile.get("searchResults", [])),
    ):
        if items:
            preview_lines.append(f"{label}:")
            for item in items[:8]:
                preview_lines.append(f"- {item}")

    return [
        {
            "type": "profile_fetch",
            "label": "Automatic profile fetch (middleware)",
            "detail": {
                "endpoint": "POST /v4/profile",
                "containerTag": container_tag,
                "customId": conversation_id,
                "memoryMode": memory_mode,
                "addMemory": middleware_config.addMemory,
                "verbose": middleware_config.verbose,
                "query": context.get("query"),
                "staticCount": len(profile.get("static", [])),
                "dynamicCount": len(profile.get("dynamic", [])),
                "searchResultCount": len(profile.get("searchResults", [])),
            },
        },
        {
            "type": "context_preview",
            "label": "Context injected into prompt",
            "preview": "\n".join(preview_lines),
        },
        {
            "type": "conversation_saved",
            "label": "Conversation auto-saved after response",
            "detail": {
                "containerTag": container_tag,
                "customId": conversation_id,
                "addMemory": middleware_config.addMemory,
                "verbose": middleware_config.verbose,
            },
        },
    ]


@app.get("/context")
async def context_get(containerTag: str = "sdk-playground", query: Optional[str] = None):
    try:
        ctx = await fetch_container_context(containerTag, query)
        return {"ok": True, "context": ctx}
    except Exception as error:
        return {"ok": False, "error": str(error)}


@app.post("/context")
async def context_post(req: ContextRequest):
    try:
        sm_key, _ = resolve_keys(req.apiKeys)
        ctx = await fetch_container_context(req.containerTag, req.query, sm_key)
        return {"ok": True, "context": ctx}
    except Exception as error:
        return {"ok": False, "error": str(error)}


@app.get("/health")
async def health():
    return {
        "ok": True,
        "playground": "sdk-playground",
        "hasSupermemoryKey": bool(os.getenv("SUPERMEMORY_API_KEY")),
        "hasOpenAiKey": bool(os.getenv("OPENAI_API_KEY")),
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
    try:
        sm_key, oai_key = resolve_keys(req.apiKeys)
        tool_trace: list[dict[str, Any]] = []
        memory_debug: list[dict[str, Any]] = []
        if req.sdkId == "py-openai-middleware":
            middleware_config = req.middlewareConfig or MiddlewareConfig()
            with playground_env_keys(sm_key, oai_key):
                text = await chat_openai_middleware(
                    req.messages,
                    req.containerTag,
                    req.conversationId,
                    req.memoryMode or "full",
                    middleware_config,
                    sm_key,
                    oai_key,
                )
            tool_trace = []
            last_user = next(
                (m.content for m in reversed(req.messages) if m.role == "user"),
                "",
            )
            query = last_user if req.memoryMode != "profile" else None
            ctx = await fetch_container_context(req.containerTag, query, sm_key)
            memory_debug = build_middleware_memory_debug(
                req.containerTag,
                req.conversationId,
                req.memoryMode or "full",
                last_user,
                ctx,
                middleware_config,
            )
        elif req.sdkId == "py-openai-tools":
            text, tool_trace = await chat_openai_tools(
                req.messages, req.containerTag, sm_key, oai_key
            )
        elif req.sdkId == "py-supermemory-direct":
            text = await chat_supermemory_direct(
                req.messages, req.containerTag, sm_key, oai_key
            )
            tool_trace = []
            last_user = next(
                (m.content for m in reversed(req.messages) if m.role == "user"),
                "",
            )
            ctx = await fetch_container_context(req.containerTag, last_user, sm_key)
            memory_debug = [
                {
                    "type": "manual_profile",
                    "label": "Manual profile() + add() pattern",
                    "detail": {
                        "containerTag": req.containerTag,
                        "query": last_user,
                        "staticCount": len(ctx["profile"]["static"]),
                        "dynamicCount": len(ctx["profile"]["dynamic"]),
                        "searchResultCount": len(ctx["profile"]["searchResults"]),
                    },
                },
                {
                    "type": "conversation_saved",
                    "label": "Conversation saved via client.add()",
                    "detail": {
                        "containerTag": req.containerTag,
                        "customId": "sdk-playground-direct",
                    },
                },
            ]
        else:
            return {
                "ok": False,
                "error": f"Unknown Python chat SDK: {req.sdkId}",
                "durationMs": int((time.time() - started) * 1000),
            }

        return {
            "ok": True,
            "sdkId": req.sdkId,
            "message": {"role": "assistant", "content": text},
            "toolTrace": tool_trace,
            "memoryDebug": memory_debug,
            "durationMs": int((time.time() - started) * 1000),
        }
    except Exception as error:
        return {
            "ok": False,
            "sdkId": req.sdkId,
            "error": str(error),
            "durationMs": int((time.time() - started) * 1000),
        }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SDK_PLAYGROUND_PYTHON_PORT", "8792"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
