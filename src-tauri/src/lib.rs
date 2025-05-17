// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod whisper;
use whisper::{
    download_model, list_models, list_remote_models, remove_model, run_whisper_cli, transcribe_file,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            run_whisper_cli,
            list_models,
            download_model,
            transcribe_file,
            list_remote_models,
            remove_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
