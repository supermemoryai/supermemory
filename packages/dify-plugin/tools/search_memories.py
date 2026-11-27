from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage
from supermemory.core.api_error import ApiError

from tools.utils import api_error_message, get_client, optional_text, require_text

SEARCH_MODES = ("hybrid", "memories", "chunks")


class SearchMemoriesTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        namespace = require_text(tool_parameters, "namespace")
        query = require_text(tool_parameters, "query")

        options: dict[str, Any] = {}
        limit = tool_parameters.get("limit")
        if limit is not None and limit != "":
            limit = int(limit)
            if not 1 <= limit <= 100:
                raise ValueError("'limit' must be between 1 and 100.")
            options["limit"] = limit
        search_mode = optional_text(tool_parameters, "search_mode")
        if search_mode:
            if search_mode not in SEARCH_MODES:
                raise ValueError(f"'search_mode' must be one of: {', '.join(SEARCH_MODES)}.")
            options["search_mode"] = search_mode
        threshold = tool_parameters.get("threshold")
        if threshold is not None and threshold != "":
            threshold = float(threshold)
            if not 0 <= threshold <= 1:
                raise ValueError("'threshold' must be between 0 and 1.")
            options["threshold"] = threshold

        client = get_client(self.runtime.credentials)
        try:
            response = client.search(namespace, query=query, **options)
        except ApiError as e:
            raise Exception(api_error_message(e)) from e

        yield self.create_json_message(response.dict())

        if not response.results:
            yield self.create_text_message(f"No results found in namespace '{namespace}'.")
            return
        lines = [f"Found {len(response.results)} result(s) in namespace '{namespace}':"]
        for index, result in enumerate(response.results, 1):
            text = result.memory or result.chunk or ""
            lines.append(f"{index}. {text} (id: {result.id}, similarity: {result.similarity:.2f})")
        yield self.create_text_message("\n".join(lines))
