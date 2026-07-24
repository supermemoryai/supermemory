"""Regression tests for supermemory SDK compatibility (issue #1235).

These tests must not require SUPERMEMORY_API_KEY — the failure mode was
an ImportError at package import time with supermemory 3.50+.
"""

from __future__ import annotations

import importlib
import inspect


def test_package_imports_cleanly() -> None:
    """Importing supermemory_openai must not raise with current supermemory."""
    module = importlib.import_module("supermemory_openai")
    assert hasattr(module, "SupermemoryTools")
    assert hasattr(module, "with_supermemory")
    assert hasattr(module, "MemoryObject")
    assert hasattr(module, "MemoryAddResult")


def test_tools_module_uses_current_sdk_types() -> None:
    """Tools module must import renamed supermemory 3.50 types."""
    from supermemory.types import AddResponse, DocumentGetResponse
    from supermemory_openai.tools import MemoryObject, MemoryAddResult

    # MemoryObject is a Union of the current SDK response types
    assert AddResponse is not None
    assert DocumentGetResponse is not None
    # Runtime alias should resolve (typing.Union is fine either way)
    assert MemoryObject is not None
    assert MemoryAddResult is not None


def test_add_memory_uses_client_add_not_memories_add() -> None:
    """add_memory must call client.add (memories.add was removed in 3.50)."""
    import supermemory
    from supermemory_openai.tools import SupermemoryTools

    client = supermemory.AsyncSupermemory(api_key="sm_test_key_for_signature_check")
    assert hasattr(client, "add")
    assert callable(client.add)
    # memories resource no longer exposes add
    assert not hasattr(client.memories, "add")

    # Source-level guard: tools.add_memory must reference client.add
    source = inspect.getsource(SupermemoryTools.add_memory)
    assert "self.client.add(" in source
    assert "self.client.memories.add" not in source


def test_middleware_add_memory_tool_uses_client_add() -> None:
    """Middleware save path must use client.add as well."""
    from supermemory_openai.middleware import add_memory_tool

    source = inspect.getsource(add_memory_tool)
    assert "client.add(" in source
    # Reject the removed memories resource call site (allow comments that mention it).
    assert "result = client.memories.add" not in source
    assert "client.memories.add(**" not in source
