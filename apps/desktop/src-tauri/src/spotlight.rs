use serde::{Deserialize, Serialize};
use tauri::{
    App, AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const MAIN_LABEL: &str = "main";
const SPOTLIGHT_LABEL: &str = "spotlight";
const OPEN_MEMORY_EVENT: &str = "nav:open-memory";
const SHOWN_EVENT: &str = "spotlight:shown";

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

pub fn shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyM)
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

pub fn register_shortcut(app: &App) {
    let result = app
        .global_shortcut()
        .on_shortcut(shortcut(), |app, shortcut, event| {
            if event.state == ShortcutState::Pressed && shortcut.matches(
                Modifiers::SUPER | Modifiers::SHIFT,
                Code::KeyM,
            ) {
                let _ = toggle(app);
            }
        });

    if let Err(error) = result {
        eprintln!("failed to register Supermemory spotlight shortcut: {error}");
    }
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
