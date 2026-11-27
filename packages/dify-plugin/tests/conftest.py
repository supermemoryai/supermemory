# dify_plugin applies gevent patches on import, so it must load before httpx does.
import dify_plugin  # noqa: F401, I001

from unittest.mock import MagicMock

import pytest


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    """Replace the Supermemory client class so no test reaches the network."""
    instance = MagicMock(name="supermemory_client")
    factory = MagicMock(name="Supermemory", return_value=instance)
    monkeypatch.setattr("tools.utils.Supermemory", factory)
    instance.factory = factory
    return instance
