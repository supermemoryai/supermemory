from unittest.mock import MagicMock

import pytest
from supermemory.errors.forbidden_error import ForbiddenError
from supermemory.types.profile_response import ProfileResponse

from tests.helpers import build, invoke, json_output, text_output
from tools.get_profile import GetProfileTool

RESPONSE = {
    "profile": {
        "static": [{"id": "mem_1", "memory": "Alex is a product manager."}],
        "dynamic": [{"id": "mem_2", "memory": "Alex is planning the Q3 launch."}],
        "buckets": {
            "interests": [{"id": "mem_3", "memory": "Alex follows cycling."}],
            "empty": [],
        },
    }
}


def test_profile_is_returned_as_json_and_text(client: MagicMock) -> None:
    client.profile.return_value = build(ProfileResponse, RESPONSE)

    messages = invoke(GetProfileTool, {"namespace": "user_alex"})

    client.profile.assert_called_once_with("user_alex")
    assert json_output(messages) == RESPONSE
    assert text_output(messages) == (
        "Static profile:\n"
        "- Alex is a product manager.\n"
        "Dynamic profile:\n"
        "- Alex is planning the Q3 launch.\n"
        "Bucket 'interests':\n"
        "- Alex follows cycling."
    )


def test_empty_profile(client: MagicMock) -> None:
    empty = {"profile": {"static": [], "dynamic": [], "buckets": {}}}
    client.profile.return_value = build(ProfileResponse, empty)

    messages = invoke(GetProfileTool, {"namespace": "new_user"})

    assert json_output(messages) == empty
    assert text_output(messages) == "No profile found for namespace 'new_user' yet."


def test_namespace_is_required(client: MagicMock) -> None:
    with pytest.raises(ValueError, match="'namespace' is required"):
        invoke(GetProfileTool, {"namespace": " "})

    client.profile.assert_not_called()


def test_api_errors_are_raised_with_a_short_message(client: MagicMock) -> None:
    client.profile.side_effect = ForbiddenError(body={"error": "Forbidden"})

    with pytest.raises(Exception) as error:
        invoke(GetProfileTool, {"namespace": "user_alex"})

    assert str(error.value) == "Supermemory API error (403): Forbidden"
