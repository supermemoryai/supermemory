import re
from pathlib import Path

import pytest
import yaml
from dify_plugin.config.config import DifyPluginEnv
from dify_plugin.core.plugin_registration import PluginRegistration

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
YAML_FILES = sorted(
    path
    for path in PLUGIN_ROOT.rglob("*.yaml")
    if ".venv" not in path.parts and "tests" not in path.parts
)

MARKETPLACE_TAGS = {
    "agent", "business", "design", "education", "entertainment", "finance", "image", "news",
    "other", "productivity", "rag", "search", "social", "travel", "utilities", "videos", "weather",
    "llm", "model_provider", "audio", "document", "devtools", "database", "security", "translation",
}  # fmt: skip


def load(relative_path: str) -> dict:
    return yaml.safe_load((PLUGIN_ROOT / relative_path).read_text(encoding="utf-8"))


@pytest.fixture
def registration(monkeypatch: pytest.MonkeyPatch) -> PluginRegistration:
    """Load the plugin the way the Dify plugin runtime does at startup."""
    monkeypatch.chdir(PLUGIN_ROOT)
    return PluginRegistration(DifyPluginEnv())


def test_yaml_files_parse() -> None:
    assert len(YAML_FILES) == 6
    for path in YAML_FILES:
        assert isinstance(yaml.safe_load(path.read_text(encoding="utf-8")), dict), path


def test_runtime_loads_provider_and_tools(registration: PluginRegistration) -> None:
    assert list(registration.tools_mapping) == ["supermemory"]
    provider, provider_cls, tools = registration.tools_mapping["supermemory"]

    assert provider_cls.__name__ == "SupermemoryProvider"
    assert [credential.name for credential in provider.credentials_schema] == [
        "supermemory_api_key"
    ]
    assert {name: tool_cls.__name__ for name, (_, tool_cls) in tools.items()} == {
        "add_memory": "AddMemoryTool",
        "search_memories": "SearchMemoriesTool",
        "get_profile": "GetProfileTool",
        "forget_memories": "ForgetMemoriesTool",
    }


def test_tool_parameters_match_the_yaml(registration: PluginRegistration) -> None:
    _, _, tools = registration.tools_mapping["supermemory"]
    parameters = {
        name: {parameter.name: parameter.required for parameter in tool.parameters}
        for name, (tool, _) in tools.items()
    }

    assert parameters == {
        "add_memory": {
            "namespace": True,
            "content": True,
            "document_id": False,
            "metadata": False,
            "dreaming": False,
        },
        "search_memories": {
            "namespace": True,
            "query": True,
            "limit": False,
            "search_mode": False,
            "threshold": False,
        },
        "get_profile": {"namespace": True},
        "forget_memories": {"namespace": True, "memory_ids": True},
    }


def test_credential_is_a_secret_with_a_console_link() -> None:
    credential = load("provider/supermemory.yaml")["credentials_for_provider"][
        "supermemory_api_key"
    ]

    assert credential["type"] == "secret-input"
    assert credential["required"] is True
    assert credential["url"] == "https://console.supermemory.ai"


def test_manifest_has_the_fields_marketplace_review_requires() -> None:
    manifest = load("manifest.yaml")

    assert manifest["author"] == "supermemoryai"
    assert manifest["name"] == "supermemory"
    assert manifest["version"] == "0.0.1"
    assert manifest["type"] == "plugin"
    assert manifest["label"]["en_US"]
    assert manifest["description"]["en_US"]
    assert manifest["meta"]["version"]
    assert manifest["meta"]["arch"] == ["amd64", "arm64"]
    assert manifest["meta"]["runner"] == {
        "language": "python",
        "version": "3.12",
        "entrypoint": "main",
    }
    assert manifest["resource"]["permission"] == {"tool": {"enabled": True}}
    assert manifest["plugins"] == {"tools": ["provider/supermemory.yaml"]}
    assert re.fullmatch(r"https://github\.com/[^\s/]+/[^\s/]+", manifest["repo"])
    assert re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", manifest["contact"])
    assert manifest["tags"] and set(manifest["tags"]) <= MARKETPLACE_TAGS
    assert manifest["network"]["domains"] == ["api.supermemory.ai"]
    assert (PLUGIN_ROOT / manifest["privacy"]).is_file()
    assert (PLUGIN_ROOT / "_assets" / manifest["icon"]).is_file()


def test_author_and_tags_are_consistent() -> None:
    manifest = load("manifest.yaml")
    provider = load("provider/supermemory.yaml")

    assert provider["identity"]["author"] == manifest["author"]
    assert provider["identity"]["tags"] == manifest["tags"]
    for tool_path in provider["tools"]:
        assert load(tool_path)["identity"]["author"] == manifest["author"], tool_path


def test_readme_links_the_source_repository() -> None:
    readme = (PLUGIN_ROOT / "README.md").read_text(encoding="utf-8")

    assert load("manifest.yaml")["repo"] in readme


def test_requirements_are_bounded() -> None:
    requirements = (PLUGIN_ROOT / "requirements.txt").read_text(encoding="utf-8").split()

    assert requirements == ["dify_plugin>=0.10.2,<0.12.0", "supermemory>=5,<6"]
