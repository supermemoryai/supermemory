"""Custom exceptions for Supermemory Cartesia integration."""

from typing import Optional


class SupermemoryCartesiaError(Exception):
    """Base exception for all Supermemory Cartesia errors."""

    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.message = message
        self.original_error = original_error

    def __str__(self) -> str:
        if self.original_error:
            return f"{self.message}: {self.original_error}"
        return self.message


class ConfigurationError(SupermemoryCartesiaError):
    """Raised when there are configuration issues (e.g., missing API key, invalid params)."""


class MemoryRetrievalError(SupermemoryCartesiaError):
    """Raised when memory retrieval operations fail."""


class MemoryStorageError(SupermemoryCartesiaError):
    """Raised when memory storage operations fail."""


class APIError(SupermemoryCartesiaError):
    """Raised when Supermemory API requests fail."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response_text: Optional[str] = None,
        original_error: Optional[Exception] = None,
    ):
        super().__init__(message, original_error)
        self.status_code = status_code
        self.response_text = response_text

    def __str__(self) -> str:
        parts = [self.message]
        if self.status_code:
            parts.append(f"Status: {self.status_code}")
        if self.response_text:
            parts.append(f"Response: {self.response_text}")
        if self.original_error:
            parts.append(f"Cause: {self.original_error}")
        return " | ".join(parts)


class NetworkError(SupermemoryCartesiaError):
    """Raised when network operations fail."""
