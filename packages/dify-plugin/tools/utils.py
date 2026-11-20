import json
from typing import Any

from supermemory import Supermemory
from supermemory.core.api_error import ApiError

REQUEST_TIMEOUT_SECONDS = 30


def get_client(credentials: dict[str, Any]) -> Supermemory:
    """Build a Supermemory client from the provider credentials."""
    api_key = str(credentials.get("supermemory_api_key") or "").strip()
    if not api_key:
        raise ValueError("Supermemory API key is required.")
    return Supermemory(api_key=api_key, timeout=REQUEST_TIMEOUT_SECONDS)


def require_text(tool_parameters: dict[str, Any], name: str) -> str:
    """Return a required string parameter, rejecting missing or blank values."""
    value = tool_parameters.get(name)
    if value is None or not str(value).strip():
        raise ValueError(f"'{name}' is required.")
    return str(value).strip()


def optional_text(tool_parameters: dict[str, Any], name: str) -> str | None:
    """Return an optional string parameter, or None when it is missing or blank."""
    value = tool_parameters.get(name)
    if value is None or not str(value).strip():
        return None
    return str(value).strip()


def parse_metadata(value: Any) -> dict[str, Any] | None:
    """Parse the metadata parameter into a flat dict accepted by Supermemory.

    Accepts a JSON object string or a dict. Values must be strings, numbers,
    booleans or lists of strings.
    """
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as e:
            raise ValueError(f"'metadata' must be a valid JSON object: {e.msg}.") from e
    if not isinstance(value, dict):
        raise ValueError("'metadata' must be a JSON object.")
    for key, item in value.items():
        if isinstance(item, (str, int, float, bool)):
            continue
        if isinstance(item, list) and all(isinstance(entry, str) for entry in item):
            continue
        raise ValueError(
            f"'metadata' value for '{key}' must be a string, number, boolean or list of strings."
        )
    return value


def parse_ids(value: Any) -> list[str]:
    """Parse memory IDs given as a JSON array, a comma-separated string or a list."""
    if isinstance(value, str):
        text = value.strip()
        if text.startswith("["):
            try:
                value = json.loads(text)
            except json.JSONDecodeError as e:
                raise ValueError(f"'memory_ids' must be a valid JSON array: {e.msg}.") from e
        else:
            value = text.split(",")
    if not isinstance(value, list):
        raise ValueError("'memory_ids' must be a comma-separated string or a JSON array.")
    ids = [str(item).strip() for item in value if str(item).strip()]
    if not ids:
        raise ValueError("'memory_ids' must contain at least one memory ID.")
    return ids


def api_error_message(error: ApiError) -> str:
    """Describe a Supermemory API error without response headers."""
    body = error.body
    if hasattr(body, "dict"):
        body = body.dict()
    detail = body
    if isinstance(body, dict):
        detail = body.get("error") or body.get("message") or body
        if isinstance(detail, list):
            detail = "; ".join(
                str(item.get("message", item)) if isinstance(item, dict) else str(item)
                for item in detail
            )
        if body.get("details"):
            detail = f"{detail} ({body['details']})"
    status = error.status_code if error.status_code is not None else "no status"
    return f"Supermemory API error ({status}): {detail}"
