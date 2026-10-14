"""Documented public names, like `InputParams`, must import from the package root."""

from __future__ import annotations

import unittest

from .test_empty_profile import _install_test_stubs

_install_test_stubs()

import supermemory_pipecat
from supermemory_pipecat import InputParams, SupermemoryPipecatService


class TestPublicExports(unittest.TestCase):
    def test_input_params_is_exported_from_the_package_root(self) -> None:
        self.assertIn("InputParams", supermemory_pipecat.__all__)
        self.assertIs(InputParams, SupermemoryPipecatService.InputParams)

    def test_documented_configuration_example_constructs(self) -> None:
        params = InputParams(
            mode="full",
            search_limit=10,
            search_threshold=0.1,
            system_prompt="Based on previous conversations:\n\n",
        )

        self.assertEqual(params.mode, "full")
        self.assertEqual(params.search_limit, 10)
        self.assertEqual(params.search_threshold, 0.1)
        self.assertEqual(params.system_prompt, "Based on previous conversations:\n\n")
