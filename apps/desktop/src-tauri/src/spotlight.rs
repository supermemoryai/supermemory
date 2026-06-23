use std::{fs, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{
    App, AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_global_shortcut::{
    GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState,
};

const MAIN_LABEL: &str = "main";
const SPOTLIGHT_LABEL: &str = "spotlight";
const OPEN_MEMORY_EVENT: &str = "nav:open-memory";
const SHOWN_EVENT: &str = "spotlight:shown";
const SHORTCUT_FILE: &str = "spotlight-shortcut.json";
const DEFAULT_SHORTCUT: &str = "CommandOrControl+Shift+M";

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotlightMemory {
    id: String,
    title: Option<String>,
    summary: Option<String>,
    content: Option<String>,
    raw: Option<String>,
    url: Option<String>,
    #[serde(rename = "type")]
    memory_type: Option<String>,
    created_at: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredShortcut {
    accelerator: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotlightShortcut {
    accelerator: String,
}

pub struct SpotlightShortcutState {
    accelerator: Mutex<String>,
}

impl SpotlightShortcutState {
    pub fn new(accelerator: String) -> Self {
        Self {
            accelerator: Mutex::new(accelerator),
        }
    }
}

pub fn create_window(app: &App) -> tauri::Result<WebviewWindow> {
    if let Some(window) = app.get_webview_window(SPOTLIGHT_LABEL) {
        return Ok(window);
    }

    let window = WebviewWindowBuilder::new(
        app,
        SPOTLIGHT_LABEL,
        WebviewUrl::App("spotlight/".into()),
    )
    .title("Supermemory Spotlight")
    .inner_size(760.0, 420.0)
    .min_inner_size(560.0, 220.0)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .center()
    .build()?;

    let window_for_blur = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Focused(false)) {
            let _ = window_for_blur.hide();
        }
    });

    Ok(window)
}

pub fn load_shortcut(app: &AppHandle) -> String {
    read_shortcut(app).unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
}

pub fn register_shortcut(app: &App, accelerator: &str) {
    if let Err(error) = register_accelerator(app, accelerator) {
        eprintln!("failed to register Supermemory spotlight shortcut: {error}");
    }
}

pub fn get_shortcut(state: &SpotlightShortcutState) -> Result<SpotlightShortcut, String> {
    Ok(SpotlightShortcut {
        accelerator: state
            .accelerator
            .lock()
            .map_err(|_| "Shortcut state lock poisoned".to_string())?
            .clone(),
    })
}

pub fn set_shortcut(
    app: &AppHandle,
    state: &SpotlightShortcutState,
    accelerator: String,
) -> Result<SpotlightShortcut, String> {
    validate_accelerator(&accelerator)?;

    let mut current = state
        .accelerator
        .lock()
        .map_err(|_| "Shortcut state lock poisoned".to_string())?;

    if *current == accelerator {
        return Ok(SpotlightShortcut {
            accelerator: current.clone(),
        });
    }

    let previous = current.clone();
    unregister_accelerator_if_registered(app, &previous)?;

    if let Err(error) = register_accelerator(app, &accelerator) {
        let _ = register_accelerator(app, &previous);
        return Err(error);
    }

    if let Err(error) = write_shortcut(app, &accelerator) {
        let _ = unregister_accelerator(app, &accelerator);
        let _ = register_accelerator(app, &previous);
        return Err(error);
    }

    *current = accelerator.clone();
    Ok(SpotlightShortcut { accelerator })
}

pub fn toggle(app: &AppHandle) -> tauri::Result<()> {
    let window = spotlight_window(app)?;
    if window.is_visible()? {
        window.hide()
    } else {
        show(app)
    }
}

pub fn show(app: &AppHandle) -> tauri::Result<()> {
    let window = spotlight_window(app)?;
    window.center()?;
    window.show()?;
    window.set_focus()?;
    window.emit(SHOWN_EVENT, ())?;
    Ok(())
}

pub fn hide(app: &AppHandle) -> tauri::Result<()> {
    spotlight_window(app)?.hide()
}

pub fn open_result(app: &AppHandle, memory: SpotlightMemory) -> tauri::Result<()> {
    if let Some(main) = app.get_webview_window(MAIN_LABEL) {
        main.show()?;
        main.set_focus()?;
        main.emit(OPEN_MEMORY_EVENT, memory)?;
    }

    hide(app)
}

fn spotlight_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    app.get_webview_window(SPOTLIGHT_LABEL)
        .ok_or_else(|| tauri::Error::WindowNotFound)
}

fn shortcut_handler(app: &AppHandle, _shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state == ShortcutState::Pressed {
        let _ = toggle(app);
    }
}

fn register_accelerator<T>(app: &T, accelerator: &str) -> Result<(), String>
where
    T: GlobalShortcutExt<tauri::Wry>,
{
    validate_accelerator(accelerator)?;
    app.global_shortcut()
        .on_shortcut(accelerator, shortcut_handler)
        .map_err(|error| error.to_string())
}

fn unregister_accelerator(app: &AppHandle, accelerator: &str) -> Result<(), String> {
	validate_accelerator(accelerator)?;
	app.global_shortcut()
		.unregister(accelerator)
		.map_err(|error| error.to_string())
}

fn unregister_accelerator_if_registered(app: &AppHandle, accelerator: &str) -> Result<(), String> {
	validate_accelerator(accelerator)?;
	if app.global_shortcut().is_registered(accelerator) {
		unregister_accelerator(app, accelerator)?;
	}
	Ok(())
}

fn validate_accelerator(accelerator: &str) -> Result<(), String> {
    accelerator
        .parse::<Shortcut>()
        .map(|_| ())
        .map_err(|error| format!("Invalid shortcut: {error}"))
}

fn read_shortcut(app: &AppHandle) -> Option<String> {
    let path = shortcut_path(app).ok()?;
    let contents = fs::read_to_string(path).ok()?;
    let stored = serde_json::from_str::<StoredShortcut>(&contents).ok()?;
    validate_accelerator(&stored.accelerator).ok()?;
    Some(stored.accelerator)
}

fn write_shortcut(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    let path = shortcut_path(app)?;
    let parent = path
        .parent()
        .ok_or_else(|| "Could not resolve shortcut config directory".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let payload = serde_json::to_vec_pretty(&StoredShortcut {
        accelerator: accelerator.to_string(),
    })
    .map_err(|error| error.to_string())?;
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, payload).map_err(|error| error.to_string())?;
    fs::rename(temp_path, path).map_err(|error| error.to_string())
}

fn shortcut_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(SHORTCUT_FILE))
}
