//! Utilities for spawning and managing ffmpeg processes for audio conversion.

use std::process::{Child, Command, Stdio};
use tauri::{AppHandle, Manager};

/// Resolves the path to the ffmpeg binary bundled with the app.
///
/// # Arguments
/// * `app` - Reference to the Tauri AppHandle.
///
/// # Returns
/// * `Ok(String)` - The resolved path to the ffmpeg binary.
/// * `Err(String)` - Error message if resolution fails.
fn resolve_ffmpeg_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .resolve(
            "gen/ffmpeg-bin/ffmpeg",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| format!("[ffmpeg] Failed to resolve ffmpeg path: {}", e))
}

/// Spawns an ffmpeg process to convert the input file to mono 16kHz WAV format.
///
/// # Arguments
/// * `app` - Reference to the Tauri AppHandle.
/// * `input_path` - Path to the input audio/video file.
///
/// # Returns
/// * `Ok(Child)` - The spawned ffmpeg process with stdout piped.
/// * `Err(String)` - Error message if spawning fails.
pub fn spawn_ffmpeg_to_wav(app: &AppHandle, input_path: &str) -> Result<Child, String> {
    let ffmpeg_path = resolve_ffmpeg_path(app)?;
    Command::new(&ffmpeg_path)
        .args([
            "-i", input_path, "-f", "wav", "-ar", "16000", "-ac", "1", "-",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("[ffmpeg] Failed to start ffmpeg: {}", e))
}
