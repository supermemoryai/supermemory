from unittest.mock import MagicMock

import pytest
from supermemory.errors.bad_request_error import BadRequestError
from supermemory.types.document_ref import DocumentRef

from tests.helpers import build, invoke, json_output, text_output
from tools.add_memory import AddMemoryTool


@pytest.fixture
def added(client: MagicMock) -> MagicMock:
    client.add.return_value = build(DocumentRef, {"id": "pref-1", "status": "queued"})
    return client


def test_required_parameters_only(added: MagicMock) -> None:
    messages = invoke(
        AddMemoryTool,
        {"namespace": " user_alex ", "content": "Alex prefers morning meetings."},
    )

    added.factory.assert_called_once_with(api_key="test-key", timeout=30)
    added.add.assert_called_once_with("user_alex", content="Alex prefers morning meetings.")
    assert json_output(messages) == {"id": "pref-1", "status": "queued", "namespace": "user_alex"}
    assert "pref-1" in text_output(messages)
    assert "queued" in text_output(messages)


def test_optional_parameters_are_passed_to_the_sdk(added: MagicMock) -> None:
    invoke(
        AddMemoryTool,
        {
            "namespace": "user_alex",
            "content": "Alex prefers morning meetings.",
            "document_id": "pref-1",
            "metadata": '{"source": "dify", "priority": 2, "pinned": true, "tags": ["a", "b"]}',
            "dreaming": "instant",
        },
    )

    added.add.assert_called_once_with(
        "user_alex",
        content="Alex prefers morning meetings.",
        id="pref-1",
        metadata={"source": "dify", "priority": 2, "pinned": True, "tags": ["a", "b"]},
        dreaming="instant",
    )


def test_blank_optional_parameters_are_omitted(added: MagicMock) -> None:
    invoke(
        AddMemoryTool,
        {
            "namespace": "user_alex",
            "content": "hello",
            "document_id": "",
            "metadata": " ",
            "dreaming": None,
        },
    )

    added.add.assert_called_once_with("user_alex", content="hello")


def test_metadata_may_be_a_dict(added: MagicMock) -> None:
    invoke(
        AddMemoryTool,
        {"namespace": "user_alex", "content": "hello", "metadata": {"source": "dify"}},
    )

    assert added.add.call_args.kwargs["metadata"] == {"source": "dify"}


@pytest.mark.parametrize(
    ("metadata", "message"),
    [
        ("{not json", "valid JSON object"),
        ('["a"]', "must be a JSON object"),
        ('{"nested": {"a": 1}}', "value for 'nested'"),
        ('{"missing": null}', "value for 'missing'"),
    ],
)
def test_invalid_metadata_is_rejected_before_any_request(
    added: MagicMock, metadata: str, message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        invoke(AddMemoryTool, {"namespace": "user_alex", "content": "hello", "metadata": metadata})

    added.add.assert_not_called()


@pytest.mark.parametrize(
    ("parameters", "name"),
    [({"content": "hello"}, "namespace"), ({"namespace": "user_alex", "content": "  "}, "content")],
)
def test_missing_required_parameters_are_rejected(
    added: MagicMock, parameters: dict, name: str
) -> None:
    with pytest.raises(ValueError, match=f"'{name}' is required"):
        invoke(AddMemoryTool, parameters)

    added.add.assert_not_called()


def test_unknown_dreaming_mode_is_rejected(added: MagicMock) -> None:
    with pytest.raises(ValueError, match="'dreaming' must be one of"):
        invoke(AddMemoryTool, {"namespace": "user_alex", "content": "hello", "dreaming": "later"})


def test_api_errors_are_raised_with_a_short_message(client: MagicMock) -> None:
    client.add.side_effect = BadRequestError(
        body={"error": "Content is too large", "details": "max 1MB"},
        headers={"x-request-id": "abc"},
    )

    with pytest.raises(Exception) as error:
        invoke(AddMemoryTool, {"namespace": "user_alex", "content": "hello"})

    assert str(error.value) == "Supermemory API error (400): Content is too large (max 1MB)"
