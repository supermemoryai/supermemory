from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage
from supermemory.core.api_error import ApiError

from tools.utils import api_error_message, get_client, optional_text, parse_metadata, require_text

DREAMING_MODES = ("dynamic", "instant")


class AddMemoryTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        namespace = require_text(tool_parameters, "namespace")
        content = require_text(tool_parameters, "content")

        options: dict[str, Any] = {}
        document_id = optional_text(tool_parameters, "document_id")
        if document_id:
            options["id"] = document_id
        metadata = parse_metadata(tool_parameters.get("metadata"))
        if metadata:
            options["metadata"] = metadata
        dreaming = optional_text(tool_parameters, "dreaming")
        if dreaming:
            if dreaming not in DREAMING_MODES:
                raise ValueError(f"'dreaming' must be one of: {', '.join(DREAMING_MODES)}.")
            options["dreaming"] = dreaming

        client = get_client(self.runtime.credentials)
        try:
            document = client.add(namespace, content=content, **options)
        except ApiError as e:
            raise Exception(api_error_message(e)) from e

        yield self.create_json_message(
            {"id": document.id, "status": document.status, "namespace": namespace}
        )
        yield self.create_text_message(
            f"Added document '{document.id}' to namespace '{namespace}' "
            f"(status: {document.status}). Memories are extracted in the background."
        )
