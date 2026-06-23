use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Manager,
};

use crate::spotlight;

const MENU_OPEN_SPOTLIGHT: &str = "open-spotlight";
const MENU_SHOW_APP: &str = "show-app";
const MENU_QUIT: &str = "quit";

pub fn create(app: &App) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text(MENU_OPEN_SPOTLIGHT, "Open Spotlight")
        .text(MENU_SHOW_APP, "Show Supermemory")
        .separator()
        .text(MENU_QUIT, "Quit")
        .build()?;
    let icon = app.default_window_icon().cloned();

    let mut tray = TrayIconBuilder::with_id("supermemory")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Supermemory")
        .icon_as_template(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_OPEN_SPOTLIGHT => {
                let _ = spotlight::show(app);
            }
            MENU_SHOW_APP => {
                let _ = show_main_window(app);
            }
            MENU_QUIT => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = spotlight::show(tray.app_handle());
            }
        });

    if let Some(icon) = icon {
        tray = tray.icon(icon);
    }

    tray.build(app)?;
    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if let Some(main) = app.get_webview_window("main") {
        main.show()?;
        main.set_focus()?;
    }
    Ok(())
}
