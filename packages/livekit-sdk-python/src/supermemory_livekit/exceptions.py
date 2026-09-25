"""Errors raised while configuring the LiveKit integration."""

from typing import Optional


class SupermemoryLiveKitError(Exception):
    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.message = message
        self.original_error = original_error

    def __str__(self) -> str:
        if self.original_error:
            return f"{self.message}: {self.original_error}"
        return self.message


class ConfigurationError(SupermemoryLiveKitError):
    """Raised when the integration cannot start, for example a missing API key."""
