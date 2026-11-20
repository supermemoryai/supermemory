from unittest.mock import MagicMock

import pytest
from supermemory.errors.unauthorized_error import UnauthorizedError
from supermemory.types.search_response import SearchResponse

from tests.helpers import build, invoke, json_output, text_output
from tools.search_memories import SearchMemoriesTool

RESPONSE = {
    "results": [
        {
            "id": "mem_1",
            "memory": "Alex prefers morning meetings.",
            "metadata": {"source": "dify"},
            "similarity": 0.912,
            "isLatest": True,
            "isInference": False,
            "system": {"updatedAt": "2026-01-01T00:00:00Z"},
        },
        {
            "id": "chunk_1",
            "chunk": "Alex: mornings work best for me.",
            "metadata": {},
            "similarity": 0.5,
            "isLatest": True,
            "isInference": False,
            "system": {"updatedAt": "2026-01-01T00:00:00Z"},
        },
    ],
    "searchTime": 12.5,
}


@pytest.fixture
def searched(client: MagicMock) -> MagicMock:
    client.search.return_value = build(SearchResponse, RESPONSE)
    return client


def test_required_parameters_only(searched: MagicMock) -> None:
    messages = invoke(
        SearchMemoriesTool, {"namespace": "user_alex", "query": "when does alex meet?"}
    )

    searched.search.assert_called_once_with("user_alex", query="when does alex meet?")
    assert json_output(messages) == RESPONSE
    assert text_output(messages) == (
        "Found 2 result(s) in namespace 'user_alex':\n"
        "1. Alex prefers morning meetings. (id: mem_1, similarity: 0.91)\n"
        "2. Alex: mornings work best for me. (id: chunk_1, similarity: 0.50)"
    )


def test_options_are_cast_and_passed_to_the_sdk(searched: MagicMock) -> None:
    invoke(
        SearchMemoriesTool,
        {
            "namespace": "user_alex",
            "query": "meetings",
            "limit": 5.0,
            "search_mode": "memories",
            "threshold": "0.6",
        },
    )

    searched.search.assert_called_once_with(
        "user_alex", query="meetings", limit=5, search_mode="memories", threshold=0.6
    )
    assert isinstance(searched.search.call_args.kwargs["limit"], int)


def test_no_results(client: MagicMock) -> None:
    client.search.return_value = build(SearchResponse, {"results": [], "searchTime": 3.0})

    messages = invoke(SearchMemoriesTool, {"namespace": "user_alex", "query": "meetings"})

    assert json_output(messages) == {"results": [], "searchTime": 3.0}
    assert text_output(messages) == "No results found in namespace 'user_alex'."


@pytest.mark.parametrize(
    ("parameters", "message"),
    [
        ({"limit": 0}, "'limit' must be between 1 and 100"),
        ({"limit": 101}, "'limit' must be between 1 and 100"),
        ({"threshold": 1.5}, "'threshold' must be between 0 and 1"),
        ({"search_mode": "fuzzy"}, "'search_mode' must be one of"),
        ({"query": ""}, "'query' is required"),
        ({"namespace": None}, "'namespace' is required"),
    ],
)
def test_invalid_parameters_are_rejected_before_any_request(
    searched: MagicMock, parameters: dict, message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        invoke(SearchMemoriesTool, {"namespace": "user_alex", "query": "meetings", **parameters})

    searched.search.assert_not_called()


def test_api_errors_are_raised_with_a_short_message(client: MagicMock) -> None:
    client.search.side_effect = UnauthorizedError(body={"error": "Unauthorized"})

    with pytest.raises(Exception) as error:
        invoke(SearchMemoriesTool, {"namespace": "user_alex", "query": "meetings"})

    assert str(error.value) == "Supermemory API error (401): Unauthorized"
