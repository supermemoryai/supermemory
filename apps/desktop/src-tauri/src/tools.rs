use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

use serde::Serialize;
use serde_json::{json, Map, Value};
use toml_edit::{value, Array, DocumentMut, Table};

const MCP_URL: &str = "https://mcp.supermemory.ai/mcp";
const SERVER_NAME: &str = "supermemory";

#[derive(Clone, Copy)]
enum ToolId {
    ClaudeCode,
    Codex,
    Cursor,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    id: &'static str,
    name: &'static str,
    detected: bool,
    connected: bool,
    config_path: String,
    config_exists: bool,
    install_hint: &'static str,
    detail: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolPreview {
    tool: ToolStatus,
    action: &'static str,
    config_path: String,
    backup_path: Option<String>,
    diff: String,
    before: String,
    after: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolConnectResult {
    tool: ToolStatus,
    backup_path: Option<String>,
}

pub fn detect() -> Result<Vec<ToolStatus>, String> {
    let mut statuses = tool_ids()
        .iter()
        .map(|tool| status_for_tool(*tool))
        .collect::<Result<Vec<_>, _>>()?;
    statuses.sort_by_key(|status| (!status.detected, !status.connected, status.name));
    Ok(statuses)
}

pub fn preview_connect(tool_id: String) -> Result<ToolPreview, String> {
    preview(tool_from_id(&tool_id)?, "connect")
}

pub fn connect(tool_id: String) -> Result<ToolConnectResult, String> {
    apply(tool_from_id(&tool_id)?, "connect")
}

pub fn preview_disconnect(tool_id: String) -> Result<ToolPreview, String> {
    preview(tool_from_id(&tool_id)?, "disconnect")
}

pub fn disconnect(tool_id: String) -> Result<ToolConnectResult, String> {
    apply(tool_from_id(&tool_id)?, "disconnect")
}

fn preview(tool: ToolId, action: &'static str) -> Result<ToolPreview, String> {
    let config_path = config_path(tool)?;
    let before = read_config_or_empty(&config_path)?;
    let after = next_config(tool, action, &before)?;
    let status = status_for_tool(tool)?;
    let backup_path = if config_path.exists() {
        Some(path_to_string(&backup_path(&config_path)))
    } else {
        None
    };

    Ok(ToolPreview {
        tool: status,
        action,
        config_path: path_to_string(&config_path),
        backup_path,
        diff: make_diff(&before, &after),
        before,
        after,
    })
}

fn apply(tool: ToolId, action: &'static str) -> Result<ToolConnectResult, String> {
    let config_path = config_path(tool)?;
    let before = read_config_or_empty(&config_path)?;
    let after = next_config(tool, action, &before)?;
    let backup = write_config_atomically(&config_path, after.as_bytes())?;

    Ok(ToolConnectResult {
        tool: status_for_tool(tool)?,
        backup_path: backup.map(|path| path_to_string(&path)),
    })
}

fn next_config(tool: ToolId, action: &str, before: &str) -> Result<String, String> {
    match action {
        "connect" => match tool {
            ToolId::ClaudeCode | ToolId::Cursor => connect_json(before),
            ToolId::Codex => connect_codex_toml(before),
        },
        "disconnect" => match tool {
            ToolId::ClaudeCode | ToolId::Cursor => disconnect_json(before),
            ToolId::Codex => disconnect_codex_toml(before),
        },
        _ => Err(format!("Unsupported tools action: {action}")),
    }
}

fn status_for_tool(tool: ToolId) -> Result<ToolStatus, String> {
    let config_path = config_path(tool)?;
    let config_exists = config_path.exists();
    let connected = is_connected(tool, &config_path)?;
    let detected = is_detected(tool);

    Ok(ToolStatus {
        id: tool.id(),
        name: tool.name(),
        detected,
        connected,
        config_path: path_to_string(&config_path),
        config_exists,
        install_hint: tool.install_hint(),
        detail: status_detail(tool, detected, connected, config_exists),
    })
}

fn is_connected(tool: ToolId, config_path: &Path) -> Result<bool, String> {
    if !config_path.exists() {
        return Ok(false);
    }

    let contents = fs::read_to_string(config_path).map_err(|error| error.to_string())?;
    match tool {
        ToolId::ClaudeCode | ToolId::Cursor => json_has_supermemory_server(&contents),
        ToolId::Codex => codex_toml_has_supermemory_server(&contents),
    }
}

fn connect_json(before: &str) -> Result<String, String> {
    let mut root = if before.trim().is_empty() {
        Value::Object(Map::new())
    } else {
        serde_json::from_str::<Value>(before).map_err(|error| format!("Invalid JSON: {error}"))?
    };

    if !root.is_object() {
        return Err("MCP JSON config must be a JSON object".to_string());
    }

    let root_object = root
        .as_object_mut()
        .ok_or_else(|| "MCP JSON config must be a JSON object".to_string())?;
    let servers = root_object
        .entry("mcpServers")
        .or_insert_with(|| Value::Object(Map::new()));

    if !servers.is_object() {
        return Err("mcpServers must be a JSON object".to_string());
    }

    servers
        .as_object_mut()
        .ok_or_else(|| "mcpServers must be a JSON object".to_string())?
        .insert(SERVER_NAME.to_string(), json!({ "url": MCP_URL }));

    serde_json::to_string_pretty(&root)
        .map(|json| format!("{json}\n"))
        .map_err(|error| error.to_string())
}

fn disconnect_json(before: &str) -> Result<String, String> {
    if before.trim().is_empty() {
        return Ok(String::new());
    }

    let mut root =
        serde_json::from_str::<Value>(before).map_err(|error| format!("Invalid JSON: {error}"))?;

    if let Some(servers) = root.get_mut("mcpServers").and_then(Value::as_object_mut) {
        servers.remove(SERVER_NAME);
    }

    serde_json::to_string_pretty(&root)
        .map(|json| format!("{json}\n"))
        .map_err(|error| error.to_string())
}

fn connect_codex_toml(before: &str) -> Result<String, String> {
    let mut doc = parse_toml(before)?;
    let servers = doc
        .entry("mcp_servers")
        .or_insert(toml_edit::Item::Table(Table::new()));

    if !servers.is_table() {
        return Err("mcp_servers must be a TOML table".to_string());
    }

    let servers_table = servers
        .as_table_mut()
        .ok_or_else(|| "mcp_servers must be a TOML table".to_string())?;
    let server = servers_table
        .entry(SERVER_NAME)
        .or_insert(toml_edit::Item::Table(Table::new()));

    if !server.is_table() {
        *server = toml_edit::Item::Table(Table::new());
    }

    let server_table = server
        .as_table_mut()
        .ok_or_else(|| "supermemory MCP server must be a TOML table".to_string())?;
    server_table["command"] = value("npx");

    let mut args = Array::new();
    args.push("-y");
    args.push("mcp-remote@latest");
    args.push(MCP_URL);
    server_table["args"] = value(args);

    Ok(doc.to_string())
}

fn disconnect_codex_toml(before: &str) -> Result<String, String> {
    let mut doc = parse_toml(before)?;

    if let Some(servers) = doc
        .get_mut("mcp_servers")
        .and_then(toml_edit::Item::as_table_mut)
    {
        servers.remove(SERVER_NAME);
    }

    Ok(doc.to_string())
}

fn json_has_supermemory_server(contents: &str) -> Result<bool, String> {
    let value = serde_json::from_str::<Value>(contents)
        .map_err(|error| format!("Invalid JSON: {error}"))?;

    Ok(value
        .get("mcpServers")
        .and_then(Value::as_object)
        .and_then(|servers| servers.get(SERVER_NAME))
        .is_some())
}

fn codex_toml_has_supermemory_server(contents: &str) -> Result<bool, String> {
    let doc = parse_toml(contents)?;
    Ok(doc
        .get("mcp_servers")
        .and_then(toml_edit::Item::as_table)
        .and_then(|servers| servers.get(SERVER_NAME))
        .is_some())
}

fn parse_toml(contents: &str) -> Result<DocumentMut, String> {
    if contents.trim().is_empty() {
        Ok(DocumentMut::new())
    } else {
        contents
            .parse::<DocumentMut>()
            .map_err(|error| format!("Invalid TOML: {error}"))
    }
}

fn write_config_atomically(path: &Path, bytes: &[u8]) -> Result<Option<PathBuf>, String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Could not resolve config parent directory".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let backup = if path.exists() {
        let backup_path = backup_path(path);
        fs::copy(path, &backup_path).map_err(|error| error.to_string())?;
        Some(backup_path)
    } else {
        None
    };

    let temp_path = path.with_extension("tmp");
    fs::write(&temp_path, bytes).map_err(|error| error.to_string())?;
    fs::rename(temp_path, path).map_err(|error| error.to_string())?;
    Ok(backup)
}

fn read_config_or_empty(path: &Path) -> Result<String, String> {
    match fs::read_to_string(path) {
        Ok(contents) => Ok(contents),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(error) => Err(error.to_string()),
    }
}

fn backup_path(path: &Path) -> PathBuf {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| format!("{extension}.smbak"))
        .unwrap_or_else(|| "smbak".to_string());
    path.with_extension(extension)
}

fn make_diff(before: &str, after: &str) -> String {
    if before == after {
        return "No changes.".to_string();
    }

    let mut diff = String::from("--- current\n+++ proposed\n");
    if !before.is_empty() {
        for line in before.lines() {
            diff.push('-');
            diff.push_str(line);
            diff.push('\n');
        }
    }
    for line in after.lines() {
        diff.push('+');
        diff.push_str(line);
        diff.push('\n');
    }
    diff
}

fn is_detected(tool: ToolId) -> bool {
    match tool {
        ToolId::ClaudeCode => find_binary("claude").is_some() || home_path(".claude").exists(),
        ToolId::Codex => find_binary("codex").is_some() || home_path(".codex").exists(),
        ToolId::Cursor => {
            PathBuf::from("/Applications/Cursor.app").exists()
                || find_binary("cursor").is_some()
                || home_path(".cursor").exists()
        }
    }
}

fn status_detail(tool: ToolId, detected: bool, connected: bool, config_exists: bool) -> String {
    if connected {
        return "Connected to the Supermemory MCP server.".to_string();
    }

    if config_exists {
        return "Config found; Supermemory is not connected yet.".to_string();
    }

    if detected {
        return "Detected locally; ready to connect.".to_string();
    }

    format!("Not detected. {}", tool.install_hint())
}

fn config_path(tool: ToolId) -> Result<PathBuf, String> {
    let home = home_dir()?;
    Ok(match tool {
        ToolId::ClaudeCode => home.join(".claude.json"),
        ToolId::Codex => env::var("CODEX_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| home.join(".codex"))
            .join("config.toml"),
        ToolId::Cursor => home.join(".cursor").join("mcp.json"),
    })
}

fn home_path(path: &str) -> PathBuf {
    home_dir()
        .map(|home| home.join(path))
        .unwrap_or_else(|_| PathBuf::from(path))
}

fn home_dir() -> Result<PathBuf, String> {
    env::var("HOME")
        .map(PathBuf::from)
        .map_err(|_| "Could not resolve HOME".to_string())
}

fn find_binary(binary: &str) -> Option<PathBuf> {
    shell_path_entries()
        .into_iter()
        .map(|path| path.join(binary))
        .find(|candidate| candidate.is_file())
}

fn shell_path_entries() -> Vec<PathBuf> {
    let mut paths: Vec<PathBuf> = env::var_os("PATH")
        .map(|path| env::split_paths(&path).collect())
        .unwrap_or_default();

    if let Ok(shell) = env::var("SHELL") {
        if let Ok(output) = Command::new(shell)
            .args(["-lc", "printf %s \"$PATH\""])
            .output()
        {
            if output.status.success() {
                let shell_path = String::from_utf8_lossy(&output.stdout);
                paths.extend(env::split_paths(shell_path.trim()));
            }
        }
    }

    if let Ok(home) = home_dir() {
        paths.push(home.join(".local").join("bin"));
        paths.push(home.join(".bun").join("bin"));
    }
    paths.push(PathBuf::from("/opt/homebrew/bin"));
    paths.push(PathBuf::from("/usr/local/bin"));

    paths.sort();
    paths.dedup();
    paths
}

fn tool_from_id(id: &str) -> Result<ToolId, String> {
    match id {
        "claude-code" => Ok(ToolId::ClaudeCode),
        "codex" => Ok(ToolId::Codex),
        "cursor" => Ok(ToolId::Cursor),
        _ => Err(format!("Unsupported tool: {id}")),
    }
}

fn tool_ids() -> [ToolId; 3] {
    [ToolId::ClaudeCode, ToolId::Codex, ToolId::Cursor]
}

impl ToolId {
    fn id(self) -> &'static str {
        match self {
            ToolId::ClaudeCode => "claude-code",
            ToolId::Codex => "codex",
            ToolId::Cursor => "cursor",
        }
    }

    fn name(self) -> &'static str {
        match self {
            ToolId::ClaudeCode => "Claude Code",
            ToolId::Codex => "Codex",
            ToolId::Cursor => "Cursor",
        }
    }

    fn install_hint(self) -> &'static str {
        match self {
            ToolId::ClaudeCode => "Install Claude Code or create ~/.claude.json.",
            ToolId::Codex => "Install Codex CLI or create ~/.codex/config.toml.",
            ToolId::Cursor => "Install Cursor or create ~/.cursor/mcp.json.",
        }
    }
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn json_connect_preserves_existing_servers() {
        let before = r#"{
  "mcpServers": {
    "other": {
      "url": "https://example.com"
    }
  }
}"#;

        let after = connect_json(before).expect("json connect should succeed");
        let parsed = serde_json::from_str::<Value>(&after).expect("valid json");
        let servers = parsed
            .get("mcpServers")
            .and_then(Value::as_object)
            .expect("mcpServers object");

        assert!(servers.get("other").is_some());
        assert_eq!(
            servers
                .get(SERVER_NAME)
                .and_then(|server| server.get("url"))
                .and_then(Value::as_str),
            Some(MCP_URL)
        );
    }

    #[test]
    fn json_disconnect_only_removes_supermemory() {
        let before = connect_json(r#"{"mcpServers":{"other":{"url":"https://example.com"}}}"#)
            .expect("json connect should succeed");
        let after = disconnect_json(&before).expect("json disconnect should succeed");
        let parsed = serde_json::from_str::<Value>(&after).expect("valid json");
        let servers = parsed
            .get("mcpServers")
            .and_then(Value::as_object)
            .expect("mcpServers object");

        assert!(servers.get("other").is_some());
        assert!(servers.get(SERVER_NAME).is_none());
    }

    #[test]
    fn codex_connect_preserves_existing_toml() {
        let before = r#"model = "gpt-5-codex"

[mcp_servers.other]
command = "node"
"#;

        let after = connect_codex_toml(before).expect("toml connect should succeed");
        let parsed = after.parse::<DocumentMut>().expect("valid toml");

        assert_eq!(parsed["model"].as_str(), Some("gpt-5-codex"));
        assert!(parsed["mcp_servers"]["other"].is_table());
        assert_eq!(
            parsed["mcp_servers"][SERVER_NAME]["command"].as_str(),
            Some("npx")
        );
    }

    #[test]
    fn codex_disconnect_only_removes_supermemory() {
        let before = connect_codex_toml(
            r#"[mcp_servers.other]
command = "node"
"#,
        )
        .expect("toml connect should succeed");
        let after = disconnect_codex_toml(&before).expect("toml disconnect should succeed");
        let parsed = after.parse::<DocumentMut>().expect("valid toml");
        let servers = parsed["mcp_servers"].as_table().expect("mcp_servers table");

        assert!(servers.get("other").is_some_and(toml_edit::Item::is_table));
        assert!(servers.get(SERVER_NAME).is_none());
    }
}
