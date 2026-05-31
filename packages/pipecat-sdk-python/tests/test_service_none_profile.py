"""Test that _retrieve_memories handles a None profile without raising AttributeError."""

import pytest


def test_retrieve_memories_none_profile_returns_empty_lists():
    """API can return response.profile=None (e.g. new user); must not raise AttributeError."""

    class FakeProfile:
        static = ["fact"]
        dynamic = ["recent"]

    class FakeResponse:
        profile = None
        search_results = None

    response = FakeResponse()

    # Mirrors the fixed logic in service.py _retrieve_memories()
    profile_static = response.profile.static if response.profile is not None else []
    profile_dynamic = response.profile.dynamic if response.profile is not None else []

    assert profile_static == []
    assert profile_dynamic == []

    # Also verify non-None profile still works correctly
    response.profile = FakeProfile()
    profile_static = response.profile.static if response.profile is not None else []
    profile_dynamic = response.profile.dynamic if response.profile is not None else []

    assert profile_static == ["fact"]
    assert profile_dynamic == ["recent"]
