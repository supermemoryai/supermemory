import pytest
from supermemory.core.api_error import ApiError
from supermemory.errors.bad_request_error import BadRequestError
from supermemory.types.error_response import ErrorResponse
from supermemory.types.validation_error_response import ValidationErrorResponse

from tests.helpers import build
from tools.utils import api_error_message


@pytest.mark.parametrize(
    ("error", "message"),
    [
        (
            BadRequestError(body=build(ErrorResponse, {"error": "Invalid namespace"})),
            "Supermemory API error (400): Invalid namespace",
        ),
        (
            BadRequestError(
                body=build(
                    ValidationErrorResponse,
                    {
                        "success": False,
                        "error": [{"message": "content is required", "path": ["content"]}],
                        "data": {"content": ""},
                    },
                )
            ),
            "Supermemory API error (400): content is required",
        ),
        (
            ApiError(status_code=502, headers={"server": "edge"}, body="Bad gateway"),
            "Supermemory API error (502): Bad gateway",
        ),
        (ApiError(body="connection reset"), "Supermemory API error (no status): connection reset"),
    ],
)
def test_api_error_message(error: ApiError, message: str) -> None:
    assert api_error_message(error) == message
