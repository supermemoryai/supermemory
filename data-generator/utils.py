"""Shared utilities: LLM client wrapper, token counting, retry logic, file I/O."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import litellm
import tiktoken

logger = logging.getLogger(__name__)

# Suppress litellm noise
litellm.suppress_debug_info = True
logging.getLogger("LiteLLM").setLevel(logging.WARNING)
logging.getLogger("litellm").setLevel(logging.WARNING)

# ---------------------------------------------------------------------------
# Token counting
# ---------------------------------------------------------------------------

_enc: tiktoken.Encoding | None = None


def _get_encoder() -> tiktoken.Encoding:
    global _enc
    if _enc is None:
        _enc = tiktoken.get_encoding("cl100k_base")
    return _enc


def count_tokens(text: str) -> int:
    """Count tokens using cl100k_base (GPT-4 / Claude approximate)."""
    return len(_get_encoder().encode(text))


def estimate_chars_for_tokens(target_tokens: int) -> int:
    """Rough estimate: 1 token ~ 4 characters for English prose."""
    return target_tokens * 4


# ---------------------------------------------------------------------------
# LLM client
# ---------------------------------------------------------------------------

DEFAULT_MODEL = "gemini/gemini-2.5-pro"
FAST_MODEL = "gemini/gemini-2.5-flash"

# Rate limiting
_semaphore: asyncio.Semaphore | None = None


def get_semaphore(max_concurrent: int = 10) -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None or _semaphore._value != max_concurrent:
        _semaphore = asyncio.Semaphore(max_concurrent)
    return _semaphore


def _default_temperature(model: str) -> float:
    """Return a sensible default temperature per model family.

    Gemini uses 1.0 as its "normal" temperature.
    Anthropic/OpenAI treat 1.0 as quite high — 0.7 is a better default for creative
    prose, and 0.1 for structured/JSON output.
    """
    model_lower = model.lower()
    if "gemini" in model_lower:
        return 1.0
    return 0.7


async def llm_call(
    prompt: str,
    *,
    model: str = DEFAULT_MODEL,
    system: str | None = None,
    temperature: float | None = None,
    max_tokens: int = 16384,
    json_mode: bool = False,
    max_retries: int = 3,
    retry_delay: float = 5.0,
    max_concurrent: int = 10,
) -> str:
    """Make an LLM call with retry logic and rate limiting.

    Args:
        temperature: If None, uses a model-aware default (1.0 for Gemini, 0.7 for others).

    Returns the raw text response.
    """
    if temperature is None:
        temperature = _default_temperature(model)

    sem = get_semaphore(max_concurrent)

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "timeout": 300,
    }
    # Gemini has limited JSON schema support through litellm — we always parse
    # JSON from the raw text response instead of relying on response_format.
    # Only enable json_mode for providers that support it reliably.
    if json_mode and "gemini" not in model.lower():
        kwargs["response_format"] = {"type": "json_object"}

    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        async with sem:
            try:
                t0 = time.monotonic()
                response = await litellm.acompletion(**kwargs)
                elapsed = time.monotonic() - t0

                text = response.choices[0].message.content
                if not text:
                    logger.warning(f"Empty response from {model} (attempt {attempt})")
                    continue

                input_tokens = getattr(response.usage, "prompt_tokens", 0)
                output_tokens = getattr(response.usage, "completion_tokens", 0)
                logger.debug(
                    f"LLM call: model={model} attempt={attempt} "
                    f"elapsed={elapsed:.1f}s in={input_tokens} out={output_tokens}"
                )
                return text

            except Exception as e:
                last_error = e
                logger.warning(f"LLM call failed (attempt {attempt}/{max_retries}): {e}")
                if attempt < max_retries:
                    await asyncio.sleep(retry_delay * attempt)

    raise RuntimeError(f"All {max_retries} LLM attempts failed. Last error: {last_error}")


async def llm_call_json(
    prompt: str,
    *,
    model: str = DEFAULT_MODEL,
    system: str | None = None,
    temperature: float | None = None,
    max_tokens: int = 16384,
    max_retries: int = 3,
    max_concurrent: int = 10,
) -> dict[str, Any]:
    """Make an LLM call and parse the response as JSON.

    For Gemini models (which have limited JSON schema support), we append an
    explicit instruction to return JSON and parse from the raw text response.
    For other providers, we use response_format=json_object.
    """
    # For Gemini, add explicit JSON instruction since we can't rely on json_mode
    effective_prompt = prompt
    if "gemini" in model.lower() and "json" not in prompt.lower()[-200:]:
        effective_prompt = prompt + "\n\nIMPORTANT: Return your response as a single valid JSON object. No markdown, no explanation — just the JSON."

    text = await llm_call(
        effective_prompt,
        model=model,
        system=system,
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=True,
        max_retries=max_retries,
        max_concurrent=max_concurrent,
    )
    return parse_json_response(text)


def parse_json_response(text: str) -> dict[str, Any]:
    """Parse LLM response as JSON, handling code blocks and partial JSON."""
    cleaned = text.strip()

    # Strip markdown code blocks
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find JSON object or array
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = cleaned.find(start_char)
            end = cleaned.rfind(end_char) + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(cleaned[start:end])
                except json.JSONDecodeError:
                    continue

        raise ValueError(f"Could not parse JSON from LLM response: {cleaned[:200]}...")


# ---------------------------------------------------------------------------
# File I/O helpers
# ---------------------------------------------------------------------------


def write_json(path: Path, data: Any) -> None:
    """Write JSON atomically."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    tmp.rename(path)


def read_json(path: Path) -> Any:
    """Read JSON file."""
    with open(path) as f:
        return json.load(f)


def write_text(path: Path, text: str) -> None:
    """Write text file atomically."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w") as f:
        f.write(text)
    tmp.rename(path)


def read_text(path: Path) -> str:
    """Read text file."""
    with open(path) as f:
        return f.read()


# ---------------------------------------------------------------------------
# Generation log
# ---------------------------------------------------------------------------


class GenerationLog:
    """Tracks generation progress and stats for checkpointing/resume."""

    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.entries: dict[str, dict[str, Any]] = {}
        if log_path.exists():
            self.entries = read_json(log_path)

    def log_file(
        self,
        file_id: str,
        *,
        model: str,
        tokens_in: int = 0,
        tokens_out: int = 0,
        retries: int = 0,
        status: str = "ok",
        error: str | None = None,
        elapsed_s: float = 0.0,
    ) -> None:
        self.entries[file_id] = {
            "model": model,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "retries": retries,
            "status": status,
            "error": error,
            "elapsed_s": round(elapsed_s, 2),
            "timestamp": time.time(),
        }
        self.save()

    def is_done(self, file_id: str) -> bool:
        entry = self.entries.get(file_id)
        return entry is not None and entry.get("status") == "ok"

    def save(self) -> None:
        write_json(self.log_path, self.entries)

    def summary(self) -> dict[str, Any]:
        total = len(self.entries)
        ok = sum(1 for e in self.entries.values() if e.get("status") == "ok")
        failed = sum(1 for e in self.entries.values() if e.get("status") == "failed")
        total_tokens_in = sum(e.get("tokens_in", 0) for e in self.entries.values())
        total_tokens_out = sum(e.get("tokens_out", 0) for e in self.entries.values())
        return {
            "total_files": total,
            "ok": ok,
            "failed": failed,
            "total_tokens_in": total_tokens_in,
            "total_tokens_out": total_tokens_out,
        }
