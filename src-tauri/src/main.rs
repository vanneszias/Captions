//! Application entrypoint for the Tauri backend.
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Main entrypoint. Launches the Tauri application.
fn main() {
    captions_lib::run()
}
