from __future__ import annotations

import sys
import types
import unittest
from unittest.mock import AsyncMock


def _install_test_stubs() -> None:
    if "loguru" not in sys.modules:
        loguru_module = types.ModuleType("loguru")

        class _Logger:
            def debug(self, *_args, **_kwargs):
                return None

            def info(self, *_args, **_kwargs):
                return None

            def warning(self, *_args, **_kwargs):
                return None

            def error(self, *_args, **_kwargs):
                return None

        loguru_module.logger = _Logger()
        sys.modules["loguru"] = loguru_module

    if "pydantic" not in sys.modules:
        pydantic_module = types.ModuleType("pydantic")

        class BaseModel:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)

        def Field(*, default=None, **_kwargs):
            return default

        pydantic_module.BaseModel = BaseModel
        pydantic_module.Field = Field
        sys.modules["pydantic"] = pydantic_module


_install_test_stubs()

from supermemory_cartesia.agent import SupermemoryCartesiaAgent


class UserTurnEnded:
    def __init__(self, content: str = "Hello") -> None:
        self.content = content
        self.history = []


class _FailingAgent:
    def __init__(self, *, fail_after_output: bool) -> None:
        self.calls = 0
        self.fail_after_output = fail_after_output

    async def process(self, _env, _event):
        self.calls += 1
        if self.fail_after_output:
            yield "first output"
        raise RuntimeError("inner agent failed")


class _SuccessfulAgent:
    def __init__(self) -> None:
        self.calls = 0

    async def process(self, _env, _event):
        self.calls += 1
        yield "output"


def _wrapper(agent) -> SupermemoryCartesiaAgent:
    return SupermemoryCartesiaAgent(
        agent=agent,
        api_key="mock_key",
        container_tag="user-123",
        custom_id="conversation-456",
    )


class TestSupermemoryCartesiaProcess(unittest.IsolatedAsyncioTestCase):
    async def test_does_not_restart_agent_after_partial_output_failure(self) -> None:
        inner_agent = _FailingAgent(fail_after_output=True)
        wrapper = _wrapper(inner_agent)
        event = UserTurnEnded()
        wrapper._prepare_user_turn = AsyncMock(return_value=event)

        outputs = []
        with self.assertRaisesRegex(RuntimeError, "inner agent failed"):
            async for output in wrapper.process(object(), event):
                outputs.append(output)

        self.assertEqual(outputs, ["first output"])
        self.assertEqual(inner_agent.calls, 1)

    async def test_does_not_restart_agent_when_it_fails_before_output(self) -> None:
        inner_agent = _FailingAgent(fail_after_output=False)
        wrapper = _wrapper(inner_agent)
        event = UserTurnEnded()
        wrapper._prepare_user_turn = AsyncMock(return_value=event)

        with self.assertRaisesRegex(RuntimeError, "inner agent failed"):
            async for _output in wrapper.process(object(), event):
                pass

        self.assertEqual(inner_agent.calls, 1)

    async def test_preparation_failure_falls_back_to_one_agent_call(self) -> None:
        inner_agent = _SuccessfulAgent()
        wrapper = _wrapper(inner_agent)
        event = UserTurnEnded()
        wrapper._prepare_user_turn = AsyncMock(
            side_effect=RuntimeError("memory preparation failed")
        )

        outputs = [output async for output in wrapper.process(object(), event)]

        self.assertEqual(outputs, ["output"])
        self.assertEqual(inner_agent.calls, 1)


if __name__ == "__main__":
    unittest.main()
