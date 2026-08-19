"""Shared pytest fixtures: stub out heavy optional dependencies.

The stubs are installed at collection time so test modules can import the
package without pipecat/cartesia, loguru, or pydantic present.
"""

from __future__ import annotations

import sys
import types


def _install_test_stubs() -> None:
    if "loguru" not in sys.modules:
        loguru_module = types.ModuleType("loguru")

        class _Logger:
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
