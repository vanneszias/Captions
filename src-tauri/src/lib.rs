//! Tauri application setup and command registration.

mod ffmpeg;
mod models;
mod subtitles;
mod whisper;
use crate::models::{
    download_model, is_model_resumable, list_models, list_remote_models, pause_model_download,
    remove_model
};
use tauri::{TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
use whisper::{run_whisper_cli, transcribe_file};

/// Initializes and runs the Tauri application, registering all backend commands and plugins.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .inner_size(700.0, 800.0)
                .title("");

            // set transparent title bar only when building for macOS
            #[cfg(target_os = "macos")]
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);

            let window = win_builder.build().unwrap();

            // set background color only when building for macOS
            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil};

                let ns_window = window.ns_window().unwrap() as id;
                unsafe {
                    let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                        nil,
                        3.0 / 255.0,
                        7.0 / 255.0,
                        18.0 / 255.0,
                        1.0,
                    );
                    ns_window.setBackgroundColor_(bg_color);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_whisper_cli,
            list_models,
            download_model,
            transcribe_file,
            list_remote_models,
            remove_model,
            is_model_resumable,
            pause_model_download,
            subtitles::filter_srt_timestamps,
            subtitles::whisper_to_srt,
            models::get_model_states,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
