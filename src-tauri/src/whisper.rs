//! Whisper CLI integration and audio transcription utilities.

use crate::ffmpeg::spawn_ffmpeg_to_wav;
use crate::models::get_models_dir;
use std::io::Read;
use std::process::{Command, Stdio};
use tauri::path::BaseDirectory;
use tauri::AppHandle;
use tauri::Manager;

/// Resolves the path to the whisper binary bundled with the app.
fn resolve_whisper_bin(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .resolve("gen/whisper-bin/whisper", BaseDirectory::Resource)
        .map_err(|e| format!("[whisper] Failed to resolve whisper binary: {}", e))
}

/// Builds the argument list for the whisper CLI.
fn build_whisper_args(
    model_path: &str,
    language: &str,
    input: &str,
    is_stdin: bool,
) -> Vec<String> {
    let mut args = vec!["-m".into(), model_path.into(), "-l".into(), language.into()];
    args.push("-f".into());
    args.push(if is_stdin { "-".into() } else { input.into() });
    args
}

/// Runs the whisper CLI with the given arguments and returns the output.
fn run_whisper_cli_internal(
    bin_path: &std::path::Path,
    args: &[String],
    stdin: Option<Stdio>,
) -> Result<String, String> {
    let mut cmd = Command::new(bin_path);
    cmd.args(args);
    if let Some(stdin) = stdin {
        cmd.stdin(stdin);
    }
    let output = cmd
        .output()
        .map_err(|e| format!("[whisper] Failed to start whisper CLI: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(format!(
            "whisper CLI failed: {}\n{}",
            String::from_utf8_lossy(&output.stderr),
            String::from_utf8_lossy(&output.stdout)
        ))
    }
}

/// Tauri command: Run the whisper CLI with arbitrary arguments.
#[tauri::command]
pub fn run_whisper_cli(args: Vec<String>, app: AppHandle) -> Result<String, String> {
    let bin_path = resolve_whisper_bin(&app)?;
    run_whisper_cli_internal(&bin_path, &args, None)
}

/// Tauri command: Transcribe an audio file using whisper, converting to WAV if needed.
///
/// # Arguments
/// * `app` - Tauri AppHandle
/// * `input_path` - Path to the input file
/// * `model` - Model name
/// * `language` - Language code
///
/// # Returns
/// * `Ok(String)` - Transcription output
/// * `Err(String)` - Error message
#[tauri::command]
pub async fn transcribe_file(
    app: AppHandle,
    input_path: String,
    model: String,
    language: String,
) -> Result<String, String> {
    use std::path::Path;
    let ext = Path::new(&input_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let is_audio = matches!(ext.as_str(), "wav" | "flac" | "mp3" | "ogg" | "m4a");
    let bin_path = resolve_whisper_bin(&app)?;
    let model_path = get_models_dir(&app).join(&model);
    let model_path_str = model_path.to_string_lossy();
    if is_audio && ext == "wav" {
        let args = build_whisper_args(&model_path_str, &language, &input_path, false);
        run_whisper_cli_internal(&bin_path, &args, None)
    } else {
        // Convert to WAV using ffmpeg and pipe to whisper
        let mut ffmpeg = spawn_ffmpeg_to_wav(&app, &input_path)?;
        let args = build_whisper_args(&model_path_str, &language, "-", true);
        let mut whisper = Command::new(&bin_path)
            .args(&args)
            .stdin(ffmpeg.stdout.take().unwrap())
            .stdout(Stdio::piped())
            .spawn()
            .map_err(|e| format!("[whisper] Failed to start whisper CLI: {}", e))?;
        let mut output = String::new();
        if let Some(mut out) = whisper.stdout.take() {
            if let Err(e) = out.read_to_string(&mut output) {
                return Err(format!("[whisper] Failed to read whisper output: {}", e));
            }
        }
        let status = whisper
            .wait()
            .map_err(|e| format!("[whisper] Failed to wait for whisper: {}", e))?;
        if status.success() {
            Ok(output)
        } else {
            Err("whisper CLI failed".to_string())
        }
    }
}
