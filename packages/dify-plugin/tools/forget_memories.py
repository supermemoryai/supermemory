from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage
from supermemory.core.api_error import ApiError

from tools.utils import api_error_message, get_client, parse_ids, require_text


class ForgetMemoriesTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        namespace = require_text(tool_parameters, "namespace")
        memory_ids = parse_ids(tool_parameters.get("memory_ids"))

        client = get_client(self.runtime.credentials)
        try:
            result = client.memories.forget(namespace, ids=memory_ids)
        except ApiError as e:
            raise Exception(api_error_message(e)) from e

        yield self.create_json_message(result.dict())

        lines = [f"Forgot {result.count} memories in namespace '{namespace}'."]
        if result.errors:
            lines.append(f"{len(result.errors)} could not be forgotten:")
            lines.extend(f"- {error.id}: {error.error}" for error in result.errors)
        yield self.create_text_message("\n".join(lines))
