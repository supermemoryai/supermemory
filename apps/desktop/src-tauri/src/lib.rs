mod auth;
mod smfs;
mod spotlight;
mod tools;
mod tray;

use serde::Serialize;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

/// Identity of the native app, surfaced to the webview over IPC.
/// `rename_all = "camelCase"` makes the JSON keys match the TypeScript `AppInfo`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfo {
    name: String,
    version: String,
    platform: String,
}

/// First proof that the webview <-> Rust IPC bridge is wired: the placeholder
/// page calls `invoke("app_info")` on mount and renders the result.
#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: "Supermemory".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
fn auth_store_token(token: String) -> Result<(), String> {
    auth::store_token(token)
}

#[tauri::command]
fn auth_get_token() -> Result<Option<String>, String> {
    auth::get_token()
}

#[tauri::command]
fn auth_clear() -> Result<(), String> {
    auth::clear_token()
}

#[tauri::command]
fn auth_begin_browser() -> Result<String, String> {
    auth::begin_browser_auth()
}

#[tauri::command]
async fn auth_whoami() -> Result<auth::AuthSession, String> {
    auth::whoami().await
}

#[tauri::command]
fn spotlight_show(app: tauri::AppHandle) -> Result<(), String> {
    spotlight::show(&app).map_err(|error| error.to_string())
}

#[tauri::command]
fn spotlight_hide(app: tauri::AppHandle) -> Result<(), String> {
    spotlight::hide(&app).map_err(|error| error.to_string())
}

#[tauri::command]
fn spotlight_open_result(
    app: tauri::AppHandle,
    memory: spotlight::SpotlightMemory,
) -> Result<(), String> {
    spotlight::open_result(&app, memory).map_err(|error| error.to_string())
}

#[tauri::command]
fn spotlight_get_shortcut(
    state: tauri::State<'_, spotlight::SpotlightShortcutState>,
) -> Result<spotlight::SpotlightShortcut, String> {
    spotlight::get_shortcut(&state)
}

#[tauri::command]
fn spotlight_set_shortcut(
    app: tauri::AppHandle,
    state: tauri::State<'_, spotlight::SpotlightShortcutState>,
    accelerator: String,
) -> Result<spotlight::SpotlightShortcut, String> {
    spotlight::set_shortcut(&app, &state, accelerator)
}

#[tauri::command]
fn smfs_state(app: tauri::AppHandle) -> Result<Vec<smfs::SmfsStatus>, String> {
    smfs::state(&app)
}

#[tauri::command]
fn smfs_mount(app: tauri::AppHandle, tag: Option<String>) -> Result<smfs::SmfsStatus, String> {
    smfs::mount(&app, tag)
}

#[tauri::command]
fn smfs_unmount(app: tauri::AppHandle, tag: Option<String>) -> Result<smfs::SmfsStatus, String> {
    smfs::unmount(&app, tag)
}

#[tauri::command]
fn smfs_sync(app: tauri::AppHandle, tag: Option<String>) -> Result<smfs::SmfsStatus, String> {
    smfs::sync(&app, tag)
}

#[tauri::command]
fn smfs_reveal(app: tauri::AppHandle, tag: Option<String>) -> Result<(), String> {
    smfs::reveal(&app, tag)
}

#[tauri::command]
fn smfs_logs(
    app: tauri::AppHandle,
    tag: Option<String>,
    lines: Option<u32>,
) -> Result<String, String> {
    smfs::logs(&app, tag, lines)
}

#[tauri::command]
fn smfs_default_container_tag() -> String {
    smfs::default_container_tag().to_string()
}

#[tauri::command]
fn smfs_profile(app: tauri::AppHandle, tag: Option<String>) -> Result<smfs::SmfsProfile, String> {
    smfs::profile(&app, tag)
}

#[tauri::command]
fn tools_detect() -> Result<Vec<tools::ToolStatus>, String> {
    tools::detect()
}

#[tauri::command]
fn tools_preview_connect(tool_id: String) -> Result<tools::ToolPreview, String> {
    tools::preview_connect(tool_id)
}

#[tauri::command]
fn tools_connect(tool_id: String) -> Result<tools::ToolConnectResult, String> {
    tools::connect(tool_id)
}

#[tauri::command]
fn tools_preview_disconnect(tool_id: String) -> Result<tools::ToolPreview, String> {
    tools::preview_disconnect(tool_id)
}

#[tauri::command]
fn tools_disconnect(tool_id: String) -> Result<tools::ToolConnectResult, String> {
    tools::disconnect(tool_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                let _ = main.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            spotlight::create_window(app)?;
            let accelerator = spotlight::load_shortcut(app.handle());
            app.manage(spotlight::SpotlightShortcutState::new(accelerator.clone()));
            spotlight::register_shortcut(app, &accelerator);
            tray::create(app)?;
            smfs::start_status_poller(app.handle().clone());
            register_auth_deep_link_handler(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_info,
            auth_store_token,
            auth_get_token,
            auth_clear,
            auth_begin_browser,
            auth_whoami,
            spotlight_show,
            spotlight_hide,
            spotlight_open_result,
            spotlight_get_shortcut,
            spotlight_set_shortcut,
            smfs_state,
            smfs_mount,
            smfs_unmount,
            smfs_sync,
            smfs_reveal,
            smfs_logs,
            smfs_default_container_tag,
            smfs_profile,
            tools_detect,
            tools_preview_connect,
            tools_connect,
            tools_preview_disconnect,
            tools_disconnect
        ])
        // Bootstrap failure is unrecoverable (no window, no app), so we abort
        // loudly here. This is the one sanctioned `expect` — see roadmap quality bar.
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn register_auth_deep_link_handler(app: &tauri::AppHandle) {
    let app_for_listener = app.clone();
    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            handle_auth_deep_link(&app_for_listener, url.as_str());
        }
    });

    if let Ok(Some(urls)) = app.deep_link().get_current() {
        for url in urls {
            handle_auth_deep_link(app, url.as_str());
        }
    }
}

fn handle_auth_deep_link(app: &tauri::AppHandle, url: &str) {
    if !auth::is_auth_deep_link(url) {
        return;
    }

    match auth::handle_deep_link(url) {
        Ok(event) => {
            let _ = app.emit("auth:changed", event);
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                let _ = main.set_focus();
            }
        }
        Err(error) => {
            let _ = app.emit("auth:error", error);
        }
    }
}
