"""Supermemory for LiveKit Agents."""

from importlib.metadata import PackageNotFoundError, version
from typing import Any

from .exceptions import ConfigurationError, SupermemoryLiveKitError
from .memory import InputParams, SupermemoryLiveKit

try:
    __version__ = version("supermemory-livekit")
except PackageNotFoundError:
    __version__ = "0.1.0"


def __getattr__(name: str) -> Any:
    if name == "SupermemoryAgent":
        from .agent import SupermemoryAgent

        return SupermemoryAgent
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "ConfigurationError",
    "InputParams",
    "SupermemoryAgent",
    "SupermemoryLiveKit",
    "SupermemoryLiveKitError",
]
