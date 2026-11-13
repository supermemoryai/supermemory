from unittest.mock import MagicMock

import pytest
from supermemory.core.api_error import ApiError
from supermemory.types.forget_result import ForgetResult

from tests.helpers import build, invoke, json_output, text_output
from tools.forget_memories import ForgetMemoriesTool

RESPONSE = {
    "count": 2,
    "errors": [],
    "matches": [
        {"id": "mem_1", "memory": "Alex prefers morning meetings."},
        {"id": "mem_2", "memory": "Alex is planning the Q3 launch."},
    ],
}


@pytest.mark.parametrize(
    "memory_ids",
    ["mem_1, mem_2", '["mem_1", "mem_2"]', ["mem_1", "mem_2"], " mem_1 ,, mem_2 ,"],
)
def test_ids_are_parsed_and_forgotten(client: MagicMock, memory_ids: object) -> None:
    client.memories.forget.return_value = build(ForgetResult, RESPONSE)

    messages = invoke(ForgetMemoriesTool, {"namespace": "user_alex", "memory_ids": memory_ids})

    client.memories.forget.assert_called_once_with("user_alex", ids=["mem_1", "mem_2"])
    assert json_output(messages) == RESPONSE
    assert text_output(messages) == "Forgot 2 memories in namespace 'user_alex'."


def test_per_id_errors_are_listed(client: MagicMock) -> None:
    partial = {
        "count": 1,
        "errors": [{"id": "mem_missing", "error": "Memory not found"}],
        "matches": [{"id": "mem_1", "memory": "Alex prefers morning meetings."}],
    }
    client.memories.forget.return_value = build(ForgetResult, partial)

    messages = invoke(
        ForgetMemoriesTool, {"namespace": "user_alex", "memory_ids": "mem_1,mem_missing"}
    )

    assert json_output(messages) == partial
    assert text_output(messages) == (
        "Forgot 1 memories in namespace 'user_alex'.\n"
        "1 could not be forgotten:\n"
        "- mem_missing: Memory not found"
    )


@pytest.mark.parametrize(
    ("memory_ids", "message"),
    [
        (None, "comma-separated string or a JSON array"),
        ("", "at least one memory ID"),
        (" , ", "at least one memory ID"),
        ("[]", "at least one memory ID"),
        ('["mem_1"', "valid JSON array"),
    ],
)
def test_invalid_ids_are_rejected_before_any_request(
    client: MagicMock, memory_ids: object, message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        invoke(ForgetMemoriesTool, {"namespace": "user_alex", "memory_ids": memory_ids})

    client.memories.forget.assert_not_called()


def test_api_errors_are_raised_with_a_short_message(client: MagicMock) -> None:
    client.memories.forget.side_effect = ApiError(status_code=503, body="Service unavailable")

    with pytest.raises(Exception) as error:
        invoke(ForgetMemoriesTool, {"namespace": "user_alex", "memory_ids": "mem_1"})

    assert str(error.value) == "Supermemory API error (503): Service unavailable"
