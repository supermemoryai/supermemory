from typing import Any

from dify_plugin.entities.tool import ToolInvokeMessage
from supermemory.core.unchecked_base_model import construct_type

CREDENTIALS = {"supermemory_api_key": "test-key"}


def build(model: Any, payload: dict[str, Any]) -> Any:
    """Build an SDK response model from an API payload, the way the SDK does."""
    return construct_type(type_=model, object_=payload)


def invoke(tool_cls: Any, parameters: dict[str, Any]) -> list[ToolInvokeMessage]:
    return list(tool_cls.from_credentials(CREDENTIALS).invoke(parameters))


def json_output(messages: list[ToolInvokeMessage]) -> Any:
    found = [
        m.message.json_object for m in messages if m.type == ToolInvokeMessage.MessageType.JSON
    ]
    assert len(found) == 1
    return found[0]


def text_output(messages: list[ToolInvokeMessage]) -> str:
    found = [m.message.text for m in messages if m.type == ToolInvokeMessage.MessageType.TEXT]
    assert len(found) == 1
    return found[0]
