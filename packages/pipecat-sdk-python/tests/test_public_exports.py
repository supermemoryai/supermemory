"""The package's documented public names must be importable from its root.

apps/docs/integrations/pipecat.mdx tells users to configure the service with
`InputParams(...)`. `InputParams` is defined as a nested class on
`SupermemoryPipecatService` (matching Pipecat's own `Service.InputParams`
convention), so it is only reachable from the package root through the alias in
`__init__.py` -- the same alias `supermemory_cartesia` provides for
`MemoryConfig`. Without it the documented quickstart fails on its import line.
"""

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
