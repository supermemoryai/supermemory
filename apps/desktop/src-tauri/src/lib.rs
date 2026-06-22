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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        // Bootstrap failure is unrecoverable (no window, no app), so we abort
        // loudly here. This is the one sanctioned `expect` — see roadmap quality bar.
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
