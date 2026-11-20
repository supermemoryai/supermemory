from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage
from supermemory.core.api_error import ApiError

from tools.utils import api_error_message, get_client, require_text


class GetProfileTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        namespace = require_text(tool_parameters, "namespace")

        client = get_client(self.runtime.credentials)
        try:
            response = client.profile(namespace)
        except ApiError as e:
            raise Exception(api_error_message(e)) from e

        yield self.create_json_message(response.dict())

        profile = response.profile
        sections = [("Static profile", profile.static), ("Dynamic profile", profile.dynamic)]
        sections.extend((f"Bucket '{name}'", facts) for name, facts in profile.buckets.items())
        lines: list[str] = []
        for title, facts in sections:
            if not facts:
                continue
            lines.append(f"{title}:")
            lines.extend(f"- {fact.memory}" for fact in facts)
        if not lines:
            yield self.create_text_message(f"No profile found for namespace '{namespace}' yet.")
            return
        yield self.create_text_message("\n".join(lines))
