"""Custom exceptions for Supermemory ADK integration."""

from typing import Optional


class SupermemoryADKError(Exception):
    """Base exception for all Supermemory ADK errors."""

    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.message = message
        self.original_error = original_error

    def __str__(self) -> str:
        if self.original_error:
            return f"{self.message}: {self.original_error}"
        return self.message


class SupermemoryConfigurationError(SupermemoryADKError):
    """Raised when there are configuration issues (e.g., missing API key, invalid params)."""

    pass


class SupermemoryAPIError(SupermemoryADKError):
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


class SupermemoryMemoryOperationError(SupermemoryADKError):
    """Raised when memory operations (search, add) fail."""

    pass


class SupermemoryTimeoutError(SupermemoryADKError):
    """Raised when operations timeout."""

    pass


class SupermemoryNetworkError(SupermemoryADKError):
    """Raised when network operations fail."""

    pass


class SupermemoryToolError(SupermemoryADKError):
    """Raised when ADK tool execution fails."""

    pass
