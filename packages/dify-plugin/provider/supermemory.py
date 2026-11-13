from typing import Any

from dify_plugin import ToolProvider
from dify_plugin.errors.tool import ToolProviderCredentialValidationError
from supermemory.core.api_error import ApiError

from tools.utils import api_error_message, get_client


class SupermemoryProvider(ToolProvider):
    def _validate_credentials(self, credentials: dict[str, Any]) -> None:
        try:
            client = get_client(credentials)
            client.namespaces.list(limit=1)
        except ApiError as e:
            if e.status_code in (401, 403):
                raise ToolProviderCredentialValidationError(
                    "Supermemory rejected the API key. "
                    "Check the key at https://console.supermemory.ai."
                ) from e
            raise ToolProviderCredentialValidationError(api_error_message(e)) from e
        except Exception as e:
            raise ToolProviderCredentialValidationError(str(e)) from e
