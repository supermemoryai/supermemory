// On Windows release builds, prevent a console window from opening alongside
// the app. No-op on macOS/Linux. Kept now so the entry point is cross-platform.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    supermemory_desktop_lib::run()
}
