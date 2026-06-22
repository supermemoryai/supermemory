mod auth;

use serde::Serialize;

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
async fn auth_whoami() -> Result<auth::AuthSession, String> {
    auth::whoami().await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_info,
            auth_store_token,
            auth_get_token,
            auth_clear,
            auth_whoami
        ])
        // Bootstrap failure is unrecoverable (no window, no app), so we abort
        // loudly here. This is the one sanctioned `expect` — see roadmap quality bar.
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
