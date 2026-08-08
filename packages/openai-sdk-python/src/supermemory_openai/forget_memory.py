"""Forget memory via DELETE /v4/memories (not exposed on supermemory SDK v3)."""

from typing import Optional

DEFAULT_BASE_URL = "https://api.supermemory.ai"


async def forget_memory_request(
    api_key: str,
    container_tag: str,
    memory_id: Optional[str] = None,
    memory_content: Optional[str] = None,
    reason: Optional[str] = None,
    base_url: str = DEFAULT_BASE_URL,
) -> None:
    """Mark a memory as forgotten via the v4 memories endpoint."""
    payload: dict[str, str] = {"containerTag": container_tag}
    if memory_id:
        payload["id"] = memory_id
    if memory_content:
        payload["content"] = memory_content
    if reason:
        payload["reason"] = reason

    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.delete(
                f"{base_url}/v4/memories",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=payload,
            ) as response:
                if not response.ok:
                    error_text = await response.text()
                    raise RuntimeError(
                        f"Supermemory forget memory failed: {response.status} "
                        f"{response.reason}. {error_text}"
                    )
    except ImportError:
        import requests

        response = requests.delete(
            f"{base_url}/v4/memories",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
            timeout=30,
        )
        if not response.ok:
            raise RuntimeError(
                f"Supermemory forget memory failed: {response.status_code} "
                f"{response.reason}. {response.text}"
            )
