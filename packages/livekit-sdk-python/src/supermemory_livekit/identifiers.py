"""Map LiveKit identities onto Supermemory container tags and custom ids."""

import hashlib
import re

_INVALID = re.compile(r"[^a-zA-Z0-9_:-]+")
_MAX_LEN = 100


def to_identifier(value: str) -> str:
    """Return a stable container tag or custom id, hashing only when sanitizing."""
    raw = value.strip()
    if not raw:
        raise ValueError("identifier is empty")

    cleaned = _INVALID.sub("_", raw).strip("_") or "id"
    if cleaned == raw and len(cleaned) <= _MAX_LEN:
        return cleaned

    digest = hashlib.sha256(raw.encode()).hexdigest()[:8]
    head = cleaned[: _MAX_LEN - len(digest) - 1].strip("_") or "id"
    return f"{head}_{digest}"[:_MAX_LEN]
