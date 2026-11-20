from unittest.mock import MagicMock

import pytest
from dify_plugin.errors.tool import ToolProviderCredentialValidationError
from supermemory.core.api_error import ApiError
from supermemory.errors.unauthorized_error import UnauthorizedError

from provider.supermemory import SupermemoryProvider


def test_valid_key_makes_one_read_only_call(client: MagicMock) -> None:
    SupermemoryProvider().validate_credentials({"supermemory_api_key": " test-key "})

    client.factory.assert_called_once_with(api_key="test-key", timeout=30)
    client.namespaces.list.assert_called_once_with(limit=1)
    assert len(client.method_calls) == 1


def test_rejected_key_raises_validation_error(client: MagicMock) -> None:
    client.namespaces.list.side_effect = UnauthorizedError(body={"error": "Unauthorized"})

    with pytest.raises(ToolProviderCredentialValidationError) as error:
        SupermemoryProvider().validate_credentials({"supermemory_api_key": "test-key"})

    assert "rejected the API key" in str(error.value)
    assert "test-key" not in str(error.value)


@pytest.mark.parametrize(
    "credentials", [{}, {"supermemory_api_key": ""}, {"supermemory_api_key": "  "}]
)
def test_missing_key_fails_without_a_request(client: MagicMock, credentials: dict) -> None:
    with pytest.raises(ToolProviderCredentialValidationError, match="API key is required"):
        SupermemoryProvider().validate_credentials(credentials)

    client.factory.assert_not_called()


def test_other_api_errors_are_reported_with_status(client: MagicMock) -> None:
    client.namespaces.list.side_effect = ApiError(
        status_code=500, headers={"x-request-id": "abc"}, body={"error": "Internal error"}
    )

    with pytest.raises(ToolProviderCredentialValidationError) as error:
        SupermemoryProvider().validate_credentials({"supermemory_api_key": "test-key"})

    assert str(error.value) == "Supermemory API error (500): Internal error"


def test_connection_errors_are_wrapped(client: MagicMock) -> None:
    client.namespaces.list.side_effect = ConnectionError("connection refused")

    with pytest.raises(ToolProviderCredentialValidationError, match="connection refused"):
        SupermemoryProvider().validate_credentials({"supermemory_api_key": "test-key"})
