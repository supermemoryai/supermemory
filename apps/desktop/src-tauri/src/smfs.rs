use std::{
    env, fs,
    path::{Path, PathBuf},
    process::{Command, Output},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

use crate::auth;

pub const CONTAINER_TAG_PREFIX: &str = "sm_fs_";
const DEFAULT_CONTAINER_TAG: &str = "sm_fs_desktop";
const STATUS_EVENT: &str = "smfs:status";
const STATUS_POLL_INTERVAL: Duration = Duration::from_secs(10);
const OWNERSHIP_DIR: &str = "smfs-owned-mounts";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmfsStatus {
    tag: String,
    state: SmfsState,
    mount_path: String,
    mount_path_configured: bool,
    owned_by_app: bool,
    profile_available: bool,
    last_sync: Option<String>,
    binary_path: String,
    error: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "kebab-case")]
enum SmfsState {
    External,
    Mounted,
    Degraded,
    Unmounted,
    MissingBinary,
    Error,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmfsStatusEvent {
    statuses: Vec<SmfsStatus>,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmfsProfile {
    tag: String,
    path: String,
    content: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnershipMarker {
    tag: String,
    mount_path: String,
    created_at_unix: u64,
}

pub fn default_container_tag() -> &'static str {
    DEFAULT_CONTAINER_TAG
}

pub fn start_status_poller(app: AppHandle) {
    thread::spawn(move || loop {
        let _ = emit_status(&app);
        thread::sleep(STATUS_POLL_INTERVAL);
    });
}

pub fn emit_status(app: &AppHandle) -> Result<(), String> {
    let event = match state(app) {
        Ok(statuses) => SmfsStatusEvent {
            statuses,
            error: None,
        },
        Err(error) => SmfsStatusEvent {
            statuses: Vec::new(),
            error: Some(error),
        },
    };

    app.emit(STATUS_EVENT, event)
        .map_err(|error| error.to_string())
}

pub fn state(app: &AppHandle) -> Result<Vec<SmfsStatus>, String> {
    Ok(vec![status_for_tag(app, DEFAULT_CONTAINER_TAG)?])
}

pub fn choose_mount_path() -> Result<Option<String>, String> {
    Ok(rfd::FileDialog::new()
        .set_title("Choose SMFS mount folder")
        .pick_folder()
        .map(|path| path_to_string(&path)))
}

pub fn mount(
    app: &AppHandle,
    tag: Option<String>,
    mount_path: Option<String>,
) -> Result<SmfsStatus, String> {
    let tag = normalize_tag(tag)?;
    let token = auth::get_token()?.ok_or_else(|| "No stored token".to_string())?;
    let (configured_path, _) = configured_mount_path(app, &tag)?;
    let mount_path = match mount_path {
        Some(path) => normalize_mount_path(path)?,
        None => configured_path,
    };
    fs::create_dir_all(&mount_path).map_err(|error| error.to_string())?;
    if !mount_path.is_dir() {
        return Err(format!(
            "{} is not a directory",
            path_to_string(&mount_path)
        ));
    }

    let status = status_for_tag(app, &tag)?;
    match status.state {
        SmfsState::External => {
            return Err(format!(
                "{tag} is already mounted outside Supermemory Desktop; leaving it untouched"
            ));
        }
        SmfsState::Mounted | SmfsState::Degraded if status.owned_by_app => {
            return Ok(status);
        }
        SmfsState::Mounted | SmfsState::Degraded => {
            return Err(format!(
                "{tag} is already mounted but is not marked as app-owned; leaving it untouched"
            ));
        }
        SmfsState::MissingBinary => {
            return Err(status
                .error
                .unwrap_or_else(|| "Could not find the smfs binary".to_string()));
        }
        SmfsState::Error | SmfsState::Unmounted => {}
    }

    let mount_path_string = path_to_string(&mount_path);
    let output = run_smfs(
        app,
        [
            "mount",
            &tag,
            "--path",
            &mount_path_string,
            "--key",
            &token,
            "--api-url",
            &auth::api_url(),
            "--sync-interval",
            "30",
        ],
    )?;
    ensure_success(output)?;
    write_ownership_marker(app, &tag, &mount_path)?;

    let status = status_for_tag(app, &tag)?;
    let _ = emit_status(app);
    Ok(status)
}

pub fn unmount(app: &AppHandle, tag: Option<String>) -> Result<SmfsStatus, String> {
    let tag = normalize_tag(tag)?;
    let status = status_for_tag(app, &tag)?;

    if matches!(status.state, SmfsState::Unmounted) {
        let _ = remove_ownership_marker(app, &tag);
        return Ok(status);
    }

    if !status.owned_by_app {
        return Err(format!(
            "{tag} is not an app-owned SMFS mount; refusing to unmount it"
        ));
    }

    let output = run_smfs(app, ["unmount", &tag])?;
    ensure_success(output)?;
    remove_ownership_marker(app, &tag)?;

    let status = status_for_tag(app, &tag)?;
    let _ = emit_status(app);
    Ok(status)
}

pub fn sync(app: &AppHandle, tag: Option<String>) -> Result<SmfsStatus, String> {
    let tag = normalize_tag(tag)?;
    let status = status_for_tag(app, &tag)?;
    if !matches!(
        status.state,
        SmfsState::Mounted | SmfsState::Degraded | SmfsState::External
    ) {
        return Err(format!("{tag} is not mounted"));
    }

    let output = run_smfs(app, ["sync", &tag])?;
    ensure_success(output)?;

    let status = status_for_tag(app, &tag)?;
    let _ = emit_status(app);
    Ok(status)
}

pub fn reveal(app: &AppHandle, tag: Option<String>) -> Result<(), String> {
    let tag = normalize_tag(tag)?;
    let status = status_for_tag(app, &tag)?;
    let path = if matches!(
        status.state,
        SmfsState::Mounted | SmfsState::Degraded | SmfsState::External
    ) {
        PathBuf::from(status.mount_path)
    } else {
        expected_mount_path(app, &tag)?
    };
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;

    let output = Command::new("open")
        .arg(path)
        .output()
        .map_err(|error| format!("Could not open Finder: {error}"))?;
    ensure_success(output)
}

pub fn logs(app: &AppHandle, tag: Option<String>, lines: Option<u32>) -> Result<String, String> {
    let tag = normalize_tag(tag)?;
    let line_count = lines.unwrap_or(200).clamp(1, 1000).to_string();
    let output = run_smfs(app, ["logs", "-n", &line_count, &tag])?;
    output_text(output)
}

pub fn profile(app: &AppHandle, tag: Option<String>) -> Result<SmfsProfile, String> {
    let tag = normalize_tag(tag)?;
    let status = status_for_tag(app, &tag)?;
    if !matches!(
        status.state,
        SmfsState::Mounted | SmfsState::Degraded | SmfsState::External
    ) {
        return Err(format!("{tag} is not mounted"));
    }

    let profile_path = PathBuf::from(status.mount_path).join("profile.md");
    let content = fs::read_to_string(&profile_path)
        .map_err(|error| format!("Could not read profile.md: {error}"))?;

    Ok(SmfsProfile {
        tag,
        path: path_to_string(&profile_path),
        content,
    })
}

fn status_for_tag(app: &AppHandle, tag: &str) -> Result<SmfsStatus, String> {
    validate_tag(tag)?;

    let (expected_mount_path, mount_path_configured) = configured_mount_path(app, tag)?;
    let binary_path = smfs_bin(app);
    let binary_path_string = path_to_string(&binary_path);
    let output = match run_smfs(app, ["status", tag, "--json"]) {
        Ok(output) => output,
        Err(error) if is_missing_binary_error(&error) => {
            return Ok(SmfsStatus {
                tag: tag.to_string(),
                state: SmfsState::MissingBinary,
                mount_path: path_to_string(&expected_mount_path),
                mount_path_configured,
                owned_by_app: false,
                profile_available: false,
                last_sync: None,
                binary_path: binary_path_string,
                error: Some(error),
            });
        }
        Err(error) => {
            return Ok(SmfsStatus {
                tag: tag.to_string(),
                state: SmfsState::Error,
                mount_path: path_to_string(&expected_mount_path),
                mount_path_configured,
                owned_by_app: false,
                profile_available: false,
                last_sync: None,
                binary_path: binary_path_string,
                error: Some(error),
            });
        }
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        let parsed = serde_json::from_str::<Value>(&stdout).unwrap_or(Value::Null);
        let active_mount_path = first_string(
            &parsed,
            &[
                &["mountPath"],
                &["mount_path"],
                &["path"],
                &["mount", "path"],
                &["mount", "mountPath"],
            ],
        )
        .map(PathBuf::from)
        .unwrap_or_else(|| expected_mount_path.clone());
        let owned_by_app = is_app_owned_mount(app, tag, &active_mount_path);
        let profile_available = active_mount_path.join("profile.md").exists();
        let mount_path_configured = owned_by_app || mount_path_configured;
        let state = if is_degraded(&parsed) {
            SmfsState::Degraded
        } else if owned_by_app {
            SmfsState::Mounted
        } else {
            SmfsState::External
        };

        return Ok(SmfsStatus {
            tag: tag.to_string(),
            state,
            mount_path: path_to_string(&active_mount_path),
            mount_path_configured,
            owned_by_app,
            profile_available,
            last_sync: first_string(&parsed, &[&["lastSync"], &["last_sync"]]),
            binary_path: binary_path_string,
            error: None,
        });
    }

    let message = format!("{stdout}{stderr}");
    if message.contains("daemon not running")
        || message.contains("no socket")
        || message.contains("not mounted")
    {
        return Ok(SmfsStatus {
            tag: tag.to_string(),
            state: SmfsState::Unmounted,
            mount_path: path_to_string(&expected_mount_path),
            mount_path_configured,
            owned_by_app: false,
            profile_available: false,
            last_sync: None,
            binary_path: binary_path_string,
            error: None,
        });
    }

    Ok(SmfsStatus {
        tag: tag.to_string(),
        state: SmfsState::Error,
        mount_path: path_to_string(&expected_mount_path),
        mount_path_configured,
        owned_by_app: false,
        profile_available: false,
        last_sync: None,
        binary_path: binary_path_string,
        error: Some(message.trim().to_string()),
    })
}

fn normalize_tag(tag: Option<String>) -> Result<String, String> {
    let tag = tag.unwrap_or_else(|| DEFAULT_CONTAINER_TAG.to_string());
    validate_tag(&tag)?;
    Ok(tag)
}

fn validate_tag(tag: &str) -> Result<(), String> {
    if !tag.starts_with(CONTAINER_TAG_PREFIX) {
        return Err(format!(
            "SMFS desktop container tags must start with {CONTAINER_TAG_PREFIX}"
        ));
    }

    if tag.len() <= CONTAINER_TAG_PREFIX.len() {
        return Err("SMFS desktop container tag needs a suffix after sm_fs_".to_string());
    }

    if tag
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || character == '_' || character == '-')
    {
        Ok(())
    } else {
        Err("SMFS desktop container tags can only contain letters, numbers, underscores, and hyphens".to_string())
    }
}

fn normalize_mount_path(path: String) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Choose a folder before mounting SMFS".to_string());
    }

    let path = shellexpand_path(trimmed);
    if path.exists() && !path.is_dir() {
        return Err(format!("{} is not a directory", path_to_string(&path)));
    }

    Ok(path)
}

fn shellexpand_path(path: &str) -> PathBuf {
    if path == "~" {
        if let Some(home) = env::var_os("HOME") {
            return PathBuf::from(home);
        }
    }

    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = env::var_os("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }

    PathBuf::from(path)
}

fn configured_mount_path(app: &AppHandle, tag: &str) -> Result<(PathBuf, bool), String> {
    if let Some(marker) = read_ownership_marker(app, tag) {
        return Ok((PathBuf::from(marker.mount_path), true));
    }

    Ok((default_mount_path(app, tag)?, false))
}

fn expected_mount_path(app: &AppHandle, tag: &str) -> Result<PathBuf, String> {
    configured_mount_path(app, tag).map(|(path, _)| path)
}

fn default_mount_path(app: &AppHandle, tag: &str) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("mounts")
        .join(tag))
}

fn ownership_marker_path(app: &AppHandle, tag: &str) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(OWNERSHIP_DIR)
        .join(format!("{tag}.json")))
}

fn write_ownership_marker(app: &AppHandle, tag: &str, mount_path: &Path) -> Result<(), String> {
    let marker_path = ownership_marker_path(app, tag)?;
    let parent = marker_path
        .parent()
        .ok_or_else(|| "Could not resolve SMFS ownership directory".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let created_at_unix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    let payload = serde_json::to_vec_pretty(&OwnershipMarker {
        tag: tag.to_string(),
        mount_path: path_to_string(mount_path),
        created_at_unix,
    })
    .map_err(|error| error.to_string())?;
    let temp_path = marker_path.with_extension("json.tmp");
    fs::write(&temp_path, payload).map_err(|error| error.to_string())?;
    fs::rename(temp_path, marker_path).map_err(|error| error.to_string())
}

fn remove_ownership_marker(app: &AppHandle, tag: &str) -> Result<(), String> {
    let marker_path = ownership_marker_path(app, tag)?;
    match fs::remove_file(marker_path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn is_app_owned_mount(app: &AppHandle, tag: &str, active_mount_path: &Path) -> bool {
    let Some(marker) = read_ownership_marker(app, tag) else {
        return false;
    };

    marker.tag == tag && PathBuf::from(marker.mount_path) == active_mount_path
}

fn read_ownership_marker(app: &AppHandle, tag: &str) -> Option<OwnershipMarker> {
    let path = ownership_marker_path(app, tag).ok()?;
    let contents = fs::read_to_string(path).ok()?;
    serde_json::from_str::<OwnershipMarker>(&contents).ok()
}

fn run_smfs<const N: usize>(app: &AppHandle, args: [&str; N]) -> Result<Output, String> {
    let binary = smfs_bin(app);
    Command::new(&binary)
        .args(args)
        .env("SUPERMEMORY_API_URL", auth::api_url())
        .output()
        .map_err(|error| format!("Could not run smfs at {}: {error}", path_to_string(&binary)))
}

fn smfs_bin(app: &AppHandle) -> PathBuf {
    if let Ok(path) = env::var("SUPERMEMORY_DESKTOP_SMFS_BIN") {
        return PathBuf::from(path);
    }

    for candidate in smfs_sidecar_candidates(app) {
        if candidate.is_file() {
            return candidate;
        }
    }

    find_in_path("smfs").unwrap_or_else(|| PathBuf::from("smfs"))
}

fn smfs_sidecar_candidates(app: &AppHandle) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("binaries").join("smfs"));
        candidates.push(resource_dir.join("smfs"));
        candidates.push(resource_dir.join("binaries").join(sidecar_name()));
        candidates.push(resource_dir.join(sidecar_name()));
    }

    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("binaries").join("smfs"));
            candidates.push(exe_dir.join("smfs"));
            candidates.push(exe_dir.join("binaries").join(sidecar_name()));
            candidates.push(exe_dir.join(sidecar_name()));
        }
    }

    candidates
}

fn sidecar_name() -> String {
    format!("smfs-{}", target_triple())
}

fn target_triple() -> String {
    let arch = env::consts::ARCH;
    let os = match env::consts::OS {
        "macos" => "apple-darwin",
        "linux" => "unknown-linux-gnu",
        other => other,
    };
    format!("{arch}-{os}")
}

fn find_in_path(binary_name: &str) -> Option<PathBuf> {
    let path = env::var_os("PATH")?;
    env::split_paths(&path)
        .map(|entry| entry.join(binary_name))
        .find(|candidate| candidate.is_file())
}

fn ensure_success(output: Output) -> Result<(), String> {
    if output.status.success() {
        Ok(())
    } else {
        Err(output_text(output)?)
    }
}

fn output_text(output: Output) -> Result<String, String> {
    let stdout = String::from_utf8(output.stdout).map_err(|error| error.to_string())?;
    let stderr = String::from_utf8(output.stderr).map_err(|error| error.to_string())?;
    let text = format!("{stdout}{stderr}");
    Ok(text.trim().to_string())
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn first_string(value: &Value, paths: &[&[&str]]) -> Option<String> {
    paths.iter().find_map(|path| {
        let found = path
            .iter()
            .try_fold(value, |current, key| current.get(key))?;
        found.as_str().map(ToString::to_string)
    })
}

fn is_degraded(value: &Value) -> bool {
    first_string(
        value,
        &[
            &["state"],
            &["status"],
            &["health"],
            &["mount", "state"],
            &["mount", "status"],
        ],
    )
    .is_some_and(|state| state.eq_ignore_ascii_case("degraded"))
}

fn is_missing_binary_error(error: &str) -> bool {
    error.contains("No such file or directory") || error.contains("os error 2")
}
