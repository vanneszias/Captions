//! Model management: download, pause, resume, remove, and state tracking for Whisper models.

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::collections::HashSet;
use std::fs;
use std::io::{BufReader, Read, Write};
use std::path::PathBuf;
use std::sync::Once;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

/// Represents a remote model available for download.
#[derive(serde::Serialize)]
pub struct RemoteModel {
    pub name: String,
    pub url: String,
    pub size: String, // human-readable
}

/// Enum for model download status.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum DownloadStatus {
    None,
    Downloading,
    Paused,
    Error,
    Downloaded,
    Removing,
    Finalizing,
}

impl Default for DownloadStatus {
    fn default() -> Self {
        DownloadStatus::None
    }
}

impl ToString for DownloadStatus {
    fn to_string(&self) -> String {
        match self {
            DownloadStatus::None => "none",
            DownloadStatus::Downloading => "downloading",
            DownloadStatus::Paused => "paused",
            DownloadStatus::Error => "error",
            DownloadStatus::Downloaded => "downloaded",
            DownloadStatus::Removing => "removing",
            DownloadStatus::Finalizing => "finalizing",
        }
        .to_string()
    }
}

impl DownloadStatus {
    fn from_str(s: &str) -> Self {
        match s {
            "downloading" => DownloadStatus::Downloading,
            "paused" => DownloadStatus::Paused,
            "error" => DownloadStatus::Error,
            "downloaded" => DownloadStatus::Downloaded,
            "removing" => DownloadStatus::Removing,
            "finalizing" => DownloadStatus::Finalizing,
            _ => DownloadStatus::None,
        }
    }
}

/// State for a model download.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ModelDownloadState {
    pub status: String, // Use DownloadStatus as string for serialization compatibility
    pub progress: u64,  // percent
    pub downloaded: u64, // bytes
    pub total: u64,     // bytes
    pub error: Option<String>,
}

// --- State Management ---

static MODEL_STATES: Lazy<Arc<Mutex<HashMap<String, ModelDownloadState>>>> =
    Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

static INIT: Once = Once::new();

static LAST_STATE_UPDATE: Lazy<Arc<Mutex<HashMap<String, Instant>>>> =
    Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

static FINALIZING_LOCKS: Lazy<Arc<Mutex<HashSet<String>>>> =
    Lazy::new(|| Arc::new(Mutex::new(HashSet::new())));

/// Call this at the start of every command to ensure state is loaded and cleaned up.
fn init_model_states(app: &AppHandle) {
    INIT.call_once(|| {
        {
            let mut states = MODEL_STATES.lock().unwrap();
            let disk_states = load_states(app);
            for (k, mut v) in disk_states {
                // If app crashed during download, set to paused
                if DownloadStatus::from_str(&v.status) == DownloadStatus::Downloading {
                    v.status = DownloadStatus::Paused.to_string();
                }
                states.insert(k, v);
            }
        } // lock is dropped here before returning from call_once
    });
}

/// Returns the models directory path.
pub fn get_models_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("models")
}

fn get_states_path(app: &AppHandle) -> PathBuf {
    get_models_dir(app).join("model_states.json")
}

fn load_states(app: &AppHandle) -> HashMap<String, ModelDownloadState> {
    let path = get_states_path(app);
    if let Ok(mut file) = fs::File::open(&path) {
        let mut contents = String::new();
        if file.read_to_string(&mut contents).is_ok() {
            if let Ok(map) = serde_json::from_str(&contents) {
                return map;
            }
        }
    }
    HashMap::new()
}

fn save_states(app: &AppHandle, states: &HashMap<String, ModelDownloadState>) {
    let path = get_states_path(app);
    if let Ok(json) = serde_json::to_string_pretty(states) {
        if let Ok(mut file) = fs::File::create(&path) {
            let _ = file.write_all(json.as_bytes());
        }
    }
}

/// Helper to emit model state updates to the frontend.
fn emit_model_states(app: &AppHandle, states: &HashMap<String, ModelDownloadState>) {
    let _ = app.emit(
        "model-states-updated",
        serde_json::json!({ "states": states }),
    );
}

// --- Model Management Commands ---

#[tauri::command]
pub fn list_models(app: AppHandle) -> Result<Vec<String>, String> {
    println!("[list_models] called");
    let models_dir = get_models_dir(&app);
    let mut models = Vec::new();
    if let Ok(entries) = std::fs::read_dir(models_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    models.push(name.to_string());
                }
            }
        }
    }
    println!("[list_models] returning models: {:?}", models);
    Ok(models)
}

#[tauri::command]
pub fn is_model_resumable(app: AppHandle, model_name: String) -> Result<(bool, u64), String> {
    let models_dir = get_models_dir(&app);
    let part_path = models_dir.join(format!("{}.part", &model_name));
    let dest_path = models_dir.join(&model_name);
    // Prefer .part file for resumability
    let path = if part_path.exists() {
        part_path
    } else {
        dest_path
    };
    if path.exists() {
        if let Ok(metadata) = std::fs::metadata(&path) {
            let size = metadata.len();
            return Ok((size > 0, size));
        }
    }
    Ok((false, 0))
}

#[tauri::command]
pub fn pause_model_download(app: AppHandle, model_name: String) -> Result<(), String> {
    let mut states = MODEL_STATES.lock().unwrap();
    let mut last_update_map = LAST_STATE_UPDATE.lock().unwrap();
    let now = Instant::now();
    let should_update = match last_update_map.entry(model_name.clone()) {
        Entry::Occupied(mut e) => {
            let last = e.get_mut();
            if now.duration_since(*last) >= Duration::from_secs(1) {
                *last = now;
                true
            } else {
                false
            }
        }
        Entry::Vacant(e) => {
            e.insert(now);
            true
        }
    };
    if let Some(state) = states.get_mut(&model_name) {
        state.status = DownloadStatus::Paused.to_string();
    }
    if should_update {
        save_states(&app, &states);
        // Emit updated states
        emit_model_states(&app, &states);
    }
    Ok(())
}

#[tauri::command]
pub async fn download_model(app: AppHandle, model_name: String) -> Result<(), String> {
    {
        // Synchronously initialize model states before any .await
        init_model_states(&app);
        // If state is Paused, set to Downloading so resume works
        let mut states = MODEL_STATES.lock().unwrap();
        if let Some(state) = states.get_mut(&model_name) {
            if DownloadStatus::from_str(&state.status) == DownloadStatus::Paused {
                state.status = DownloadStatus::Downloading.to_string();
                save_states(&app, &states);
            } else if DownloadStatus::from_str(&state.status) == DownloadStatus::Finalizing {
                // If already finalizing, return early
                return Err("Model is currently being finalized".to_string());
            }
        }
    }
    println!("[download_model] ENTRY: model_name={}", model_name);
    use futures_util::StreamExt;
    use reqwest::Client;
    use std::fs;
    use std::io::SeekFrom;
    use tokio::fs as async_fs;
    use tokio::io::AsyncSeekExt;
    use tokio::io::AsyncWriteExt;

    let url = format!(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{}",
        model_name
    );
    let models_dir = get_models_dir(&app);
    if !models_dir.exists() {
        println!(
            "[download_model] models_dir does not exist, creating: {:?}",
            models_dir
        );
        if let Err(e) = std::fs::create_dir_all(&models_dir) {
            {
                let mut states = MODEL_STATES.lock().unwrap();
                states.insert(
                    model_name.clone(),
                    ModelDownloadState {
                        status: DownloadStatus::Error.to_string(),
                        progress: 0,
                        downloaded: 0,
                        total: 0,
                        error: Some(format!("Failed to create models dir: {}", e)),
                    },
                );
                save_states(&app, &states);
            }
            println!("[download_model] ERROR: Failed to create models dir: {}", e);
            return Err(format!("Failed to create models dir: {}", e));
        }
    }
    let part_path = models_dir.join(format!("{}.part", &model_name));
    let dest_path = models_dir.join(&model_name);
    // Check if .part file exists and is complete (with tolerance)
    let maybe_finalize = {
        let states = MODEL_STATES.lock().unwrap();
        if let Some(state) = states.get(&model_name) {
            // Allow a tolerance of 1MB (1048576 bytes), checksum will be done later to ensure integrity
            if state.total > 0 && state.downloaded + 1048576 >= state.total {
                true
            } else {
                false
            }
        } else {
            false
        }
    }; // drop MutexGuard before await
    if maybe_finalize {
        // Lock finalization
        {
            let mut locks = FINALIZING_LOCKS.lock().unwrap();
            if locks.contains(&model_name) {
                return Err("Model is currently being finalized".to_string());
            }
            locks.insert(model_name.clone());
        } // MutexGuard dropped here
          // Set state to finalizing
        {
            let mut states = MODEL_STATES.lock().unwrap();
            if let Some(state) = states.get_mut(&model_name) {
                state.status = DownloadStatus::Finalizing.to_string();
                save_states(&app, &states);
                emit_model_states(&app, &states);
            }
        }
        let app2 = app.clone();
        let model_name2 = model_name.clone();
        let part_path2 = part_path.clone();
        let dest_path2 = dest_path.clone();
        let result = match tokio::task::spawn_blocking(move || {
            finalize_model_download(&app2, &model_name2, &part_path2, &dest_path2)
        })
        .await
        {
            Ok(Ok(())) => {
                let mut locks = FINALIZING_LOCKS.lock().unwrap();
                locks.remove(&model_name);
                Ok(())
            }
            Ok(Err(e)) => {
                let mut locks = FINALIZING_LOCKS.lock().unwrap();
                locks.remove(&model_name);
                Err(e)
            }
            Err(e) => {
                let mut locks = FINALIZING_LOCKS.lock().unwrap();
                locks.remove(&model_name);
                Err(format!("spawn_blocking failed: {}", e))
            }
        };
        return result;
    }
    // --- Begin loop for retrying after 416 error ---
    loop {
        let mut downloaded: u64 = 0;
        let mut file_exists = false;
        let mut file_size: u64 = 0;
        let mut server_file_size: u64 = 0;
        if part_path.exists() {
            if let Ok(metadata) = fs::metadata(&part_path) {
                file_size = metadata.len();
                downloaded = file_size;
                file_exists = true;
                println!(
                    "[download_model] Found partial file: {:?} ({} bytes)",
                    part_path, file_size
                );
                // Make an async HEAD request to get the server's file size
                let client = Client::new();
                let head_resp = client.head(&url).send().await;
                if let Ok(head) = head_resp {
                    if let Some(len) = head.headers().get("content-length") {
                        if let Ok(len_str) = len.to_str() {
                            if let Ok(len_val) = len_str.parse::<u64>() {
                                server_file_size = len_val;
                            }
                        }
                    }
                }
                if server_file_size > 0 {
                    if file_size > server_file_size {
                        // Local file is too large, delete and start over
                        println!("[download_model] Local .part file is larger than server file size ({} > {}), deleting and starting over", file_size, server_file_size);
                        let _ = fs::remove_file(&part_path);
                        file_size = 0;
                        downloaded = 0;
                        file_exists = false;
                    } else if file_size == server_file_size {
                        // Local file matches server file size, try to finalize
                        // Lock finalization
                        {
                            let mut locks = FINALIZING_LOCKS.lock().unwrap();
                            if locks.contains(&model_name) {
                                return Err("Model is currently being finalized".to_string());
                            }
                            locks.insert(model_name.clone());
                        } // MutexGuard dropped here
                          // Set state to finalizing
                        {
                            let mut states = MODEL_STATES.lock().unwrap();
                            if let Some(state) = states.get_mut(&model_name) {
                                state.status = DownloadStatus::Finalizing.to_string();
                                save_states(&app, &states);
                                emit_model_states(&app, &states);
                            }
                        }
                        let app2 = app.clone();
                        let model_name2 = model_name.clone();
                        let part_path2 = part_path.clone();
                        let dest_path2 = dest_path.clone();
                        let result = match tokio::task::spawn_blocking(move || {
                            finalize_model_download(&app2, &model_name2, &part_path2, &dest_path2)
                        })
                        .await
                        {
                            Ok(Ok(())) => {
                                let mut locks = FINALIZING_LOCKS.lock().unwrap();
                                locks.remove(&model_name);
                                Ok(())
                            }
                            Ok(Err(e)) => {
                                let mut locks = FINALIZING_LOCKS.lock().unwrap();
                                locks.remove(&model_name);
                                Err(e)
                            }
                            Err(e) => {
                                let mut locks = FINALIZING_LOCKS.lock().unwrap();
                                locks.remove(&model_name);
                                Err(format!("spawn_blocking failed: {}", e))
                            }
                        };
                        return result;
                    }
                    // else: file_size < server_file_size, resume as normal
                } else {
                    // Could not determine server file size
                    println!("[download_model] WARNING: Could not determine server file size. Proceeding to download from scratch.");
                    // Optionally, you could choose to resume anyway, but safest is to start over
                    let _ = fs::remove_file(&part_path);
                    file_size = 0;
                    downloaded = 0;
                    file_exists = false;
                }
            }
        }
        let client = Client::new();
        let mut req = client.get(&url);
        if file_exists && file_size > 0 {
            req = req.header("Range", format!("bytes={}-", file_size));
            println!("[download_model] Resuming download from byte {}", file_size);
        }
        let resp = match req.send().await {
            Ok(r) => {
                println!("[download_model] HTTP status: {}", r.status());
                if r.status() == reqwest::StatusCode::RANGE_NOT_SATISFIABLE {
                    // 416 error, delete .part file and restart
                    println!("[download_model] HTTP 416 Range Not Satisfiable, deleting .part file and starting over");
                    let _ = fs::remove_file(&part_path);
                    // continue the loop to retry from scratch
                    continue;
                }
                r
            }
            Err(e) => {
                {
                    let mut states = MODEL_STATES.lock().unwrap();
                    states.insert(
                        model_name.clone(),
                        ModelDownloadState {
                            status: DownloadStatus::Error.to_string(),
                            progress: 0,
                            downloaded,
                            total: 0,
                            error: Some(format!("Failed to download: {}", e)),
                        },
                    );
                    save_states(&app, &states);
                }
                println!("[download_model] ERROR: Failed to download: {}", e);
                return Err(format!("Failed to download: {}", e));
            }
        };
        let status = resp.status();
        let content_range = resp
            .headers()
            .get("content-range")
            .map(|h| h.to_str().unwrap_or("").to_string());
        let total_size = match content_range {
            Some(ref range) => {
                let s = range.split('/').nth(1).unwrap_or("0");
                let parsed = s.parse::<u64>().unwrap_or(0) + file_size;
                println!(
                    "[download_model] Content-Range: {} => total_size={} (file_size={})",
                    range, parsed, file_size
                );
                parsed
            }
            None => {
                let len = resp.content_length().unwrap_or(0) + file_size;
                println!(
                    "[download_model] No Content-Range, total_size={} (file_size={})",
                    len, file_size
                );
                len
            }
        };
        let mut stream = resp.bytes_stream();
        let mut file = if file_exists && file_size > 0 && status == 206 {
            let mut f = async_fs::OpenOptions::new()
                .append(true)
                .open(&part_path)
                .await
                .map_err(|e| format!("Failed to open file for append: {}", e))?;
            f.seek(SeekFrom::End(0)).await.ok();
            println!("[download_model] Opened file for append: {:?}", part_path);
            f
        } else {
            println!("[download_model] Creating new file: {:?}", part_path);
            async_fs::File::create(&part_path)
                .await
                .map_err(|e| format!("Failed to create file: {}", e))?
        };
        let mut last_emit = std::time::Instant::now();
        while let Some(chunk) = stream.next().await {
            // Check for pause or remove
            let paused_or_removing = {
                let mut should_break = false;
                let mut states = MODEL_STATES.lock().unwrap();
                if let Some(state) = states.get_mut(&model_name) {
                    let status = DownloadStatus::from_str(&state.status);
                    if status == DownloadStatus::Removing {
                        should_break = true;
                    } else if status == DownloadStatus::Paused {
                        // If paused, break and do NOT set to Downloading
                        should_break = true;
                    }
                }
                should_break
            }; // lock released here
            if paused_or_removing {
                println!(
                    "[download_model] Paused or removing at {} bytes",
                    downloaded
                );
                break;
            }
            let chunk = match chunk {
                Ok(c) => c,
                Err(e) => {
                    {
                        let mut states = MODEL_STATES.lock().unwrap();
                        states.insert(
                            model_name.clone(),
                            ModelDownloadState {
                                status: DownloadStatus::Error.to_string(),
                                progress: (downloaded as f64 / total_size as f64 * 100.0).round()
                                    as u64,
                                downloaded,
                                total: total_size,
                                error: Some(format!("Failed to read chunk: {}", e)),
                            },
                        );
                        save_states(&app, &states);
                    }
                    println!("[download_model] ERROR: Failed to read chunk: {}", e);
                    return Err(format!("Failed to read chunk: {}", e));
                }
            };
            let chunk_size = chunk.len();
            if let Err(e) = file.write_all(&chunk).await {
                {
                    let mut states = MODEL_STATES.lock().unwrap();
                    states.insert(
                        model_name.clone(),
                        ModelDownloadState {
                            status: DownloadStatus::Error.to_string(),
                            progress: (downloaded as f64 / total_size as f64 * 100.0).round()
                                as u64,
                            downloaded,
                            total: total_size,
                            error: Some(format!("Failed to write file: {}", e)),
                        },
                    );
                    save_states(&app, &states);
                }
                println!("[download_model] ERROR: Failed to write file: {}", e);
                return Err(format!("Failed to write file: {}", e));
            }
            downloaded += chunk_size as u64;
            let progress = if total_size > 0 {
                (downloaded as f64 / total_size as f64 * 100.0).round() as u64
            } else {
                0
            };
            // Save progress persistently and emit only once per second or at 100%
            let should_update = last_emit.elapsed().as_secs_f64() >= 1.0 || progress >= 100;
            if should_update {
                {
                    let mut states = MODEL_STATES.lock().unwrap();
                    let mut state = states.get(&model_name).cloned().unwrap_or_default();
                    state.progress = progress;
                    state.downloaded = downloaded;
                    state.total = total_size;
                    // Always leave the status to Downloading in the loop
                    state.status = DownloadStatus::Downloading.to_string();
                    states.insert(model_name.clone(), state);
                    save_states(&app, &states);
                    // Only emit model-states-updated
                    emit_model_states(&app, &states);
                }
                last_emit = std::time::Instant::now();
                println!(
                    "[download_model] Progress: {}% ({} / {})",
                    progress, downloaded, total_size
                );
            }
        }
        // Always emit 100% at the end if finished
        if downloaded >= total_size {
            // At the end, update state to downloaded
            {
                let part_exists = part_path.exists();
                let dest_exists = dest_path.exists();
                if part_exists && !dest_exists {
                    // Use the helper for finalization
                    let app2 = app.clone();
                    let model_name2 = model_name.clone();
                    let part_path2 = part_path.clone();
                    let dest_path2 = dest_path.clone();
                    let result = match tokio::task::spawn_blocking(move || {
                        finalize_model_download(&app2, &model_name2, &part_path2, &dest_path2)
                    })
                    .await
                    {
                        Ok(Ok(())) => {
                            println!(
                                "[download_model] Model finalized and renamed successfully: {}",
                                model_name
                            );
                            Ok(())
                        }
                        Ok(Err(e)) => {
                            println!("[download_model] ERROR during finalization: {}", e);
                            Err(e)
                        }
                        Err(e) => {
                            println!("[download_model] ERROR: spawn_blocking failed: {}", e);
                            Err(format!("spawn_blocking failed: {}", e))
                        }
                    };
                    return result;
                }
                // After successful rename, ensure .part file is gone
                if part_path.exists() {
                    if let Err(remove_err) = std::fs::remove_file(&part_path) {
                        println!("[download_model] WARNING: .part file still existed after rename and could not be removed: {}", remove_err);
                    } else {
                        println!("[download_model] .part file removed after rename")
                    }
                }
                // FINAL SAFETY: If .bin exists and .part still exists, remove .part
                if dest_path.exists() && part_path.exists() {
                    if let Err(remove_err) = std::fs::remove_file(&part_path) {
                        println!("[download_model] FINAL WARNING: .part file still existed after download and could not be removed: {}", remove_err);
                    } else {
                        println!("[download_model] FINAL: .part file removed after download");
                    }
                }
            }
        } else if file_exists
            && file_size > 0
            && server_file_size > 0
            && file_size == server_file_size
        {
            // Post-loop: .part file matches server file size, finalize
            // Lock finalization
            {
                let mut locks = FINALIZING_LOCKS.lock().unwrap();
                if locks.contains(&model_name) {
                    return Err("Model is currently being finalized".to_string());
                }
                locks.insert(model_name.clone());
            } // MutexGuard dropped here
              // Set state to finalizing
            {
                let mut states = MODEL_STATES.lock().unwrap();
                if let Some(state) = states.get_mut(&model_name) {
                    state.status = DownloadStatus::Finalizing.to_string();
                    save_states(&app, &states);
                    emit_model_states(&app, &states);
                }
            }
            let app2 = app.clone();
            let model_name2 = model_name.clone();
            let part_path2 = part_path.clone();
            let dest_path2 = dest_path.clone();
            let result = match tokio::task::spawn_blocking(move || {
                finalize_model_download(&app2, &model_name2, &part_path2, &dest_path2)
            })
            .await
            {
                Ok(Ok(())) => {
                    let mut locks = FINALIZING_LOCKS.lock().unwrap();
                    locks.remove(&model_name);
                    Ok(())
                }
                Ok(Err(e)) => {
                    let mut locks = FINALIZING_LOCKS.lock().unwrap();
                    locks.remove(&model_name);
                    Err(e)
                }
                Err(e) => {
                    let mut locks = FINALIZING_LOCKS.lock().unwrap();
                    locks.remove(&model_name);
                    Err(format!("spawn_blocking failed: {}", e))
                }
            };
            return result;
        }
        println!("[download_model] EXIT: model_name={}", model_name);
        return Ok(());
    }
}

fn human_readable_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    match bytes {
        b if b >= GB => format!("{:.1} GB", b as f64 / GB as f64),
        b if b >= MB => format!("{:.0} MB", b as f64 / MB as f64),
        b if b >= KB => format!("{:.0} KB", b as f64 / KB as f64),
        b => format!("{} B", b),
    }
}

#[tauri::command]
pub fn list_remote_models(app: AppHandle) -> Vec<RemoteModel> {
    println!("[list_remote_models] called");
    // Ensure model states are loaded
    init_model_states(&app);
    let mut states = MODEL_STATES.lock().unwrap();
    let model_urls = vec![
        (
            "tiny",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
        ),
        (
            "base",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
        ),
        (
            "small",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
        ),
        (
            "medium",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
        ),
        (
            "large-v3-turbo",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin",
        ),
    ];
    let client = reqwest::blocking::Client::new();
    let mut updated = false;
    let models: Vec<RemoteModel> = model_urls
        .into_iter()
        .map(|(name, url)| {
            let model_file = format!("ggml-{}.bin", name);
            let (size, new_total) = if let Some(state) = states.get(&model_file) {
                if state.total > 0 {
                    (human_readable_size(state.total), None)
                } else {
                    // Not present or total is 0, fetch from remote
                    match client.head(url).send() {
                        Ok(resp) => resp
                            .headers()
                            .get("content-length")
                            .and_then(|v| v.to_str().ok())
                            .and_then(|s| s.parse::<u64>().ok())
                            .map(|bytes| (human_readable_size(bytes), Some(bytes)))
                            .unwrap_or(("?".to_string(), None)),
                        Err(_) => ("?".to_string(), None),
                    }
                }
            } else {
                // Not present, fetch from remote
                match client.head(url).send() {
                    Ok(resp) => resp
                        .headers()
                        .get("content-length")
                        .and_then(|v| v.to_str().ok())
                        .and_then(|s| s.parse::<u64>().ok())
                        .map(|bytes| (human_readable_size(bytes), Some(bytes)))
                        .unwrap_or(("?".to_string(), None)),
                    Err(_) => ("?".to_string(), None),
                }
            };
            // Now update states if needed
            if let Some(bytes) = new_total {
                states
                    .entry(model_file.clone())
                    .and_modify(|state| state.total = bytes)
                    .or_insert(ModelDownloadState {
                        status: "none".to_string(),
                        progress: 0,
                        downloaded: 0,
                        total: bytes,
                        error: None,
                    });
                updated = true;
            }
            RemoteModel {
                name: name.to_string(),
                url: url.to_string(),
                size,
            }
        })
        .collect();
    if updated {
        save_states(&app, &states);
    }
    models
}

#[tauri::command]
pub fn remove_model(app: AppHandle, model_name: String) -> Result<(), String> {
    init_model_states(&app);
    // Set state to removing
    let state_to_clone = {
        let states = MODEL_STATES.lock().unwrap();
        if let Some(state) = states.get(&model_name) {
            if DownloadStatus::from_str(&state.status) == DownloadStatus::Downloading {
                Some(state.clone())
            } else {
                None
            }
        } else {
            None
        }
    };
    if let Some(state) = state_to_clone {
        let mut states = MODEL_STATES.lock().unwrap();
        states.insert(
            model_name.clone(),
            ModelDownloadState {
                status: DownloadStatus::Removing.to_string(),
                ..state
            },
        );
        save_states(&app, &states);
    }
    let models_dir = get_models_dir(&app);
    let model_path = models_dir.join(&model_name);
    let part_path = models_dir.join(format!("{}.part", &model_name));
    let mut removed = false;
    if model_path.exists() {
        if let Ok(_) = std::fs::remove_file(&model_path) {
            removed = true;
        }
    }
    if part_path.exists() {
        if let Ok(_) = std::fs::remove_file(&part_path) {
            removed = true;
        }
    }
    if removed {
        let mut states = MODEL_STATES.lock().unwrap();
        states.remove(&model_name);
        save_states(&app, &states);
        return Ok(());
    } else {
        let mut states = MODEL_STATES.lock().unwrap();
        if let Some(state) = states.get_mut(&model_name) {
            state.status = DownloadStatus::Error.to_string();
            state.error = Some(format!("Failed to remove model: not found"));
        }
        save_states(&app, &states);
        return Err(format!("Failed to remove model: not found"));
    }
}

#[tauri::command]
pub fn get_model_states(app: AppHandle) -> Result<HashMap<String, ModelDownloadState>, String> {
    init_model_states(&app);
    let states = MODEL_STATES.lock().unwrap();
    // Emit updated states on load
    emit_model_states(&app, &states);
    Ok(states.clone())
}

/// Fetch and parse the Hugging Face README for model SHA256s.
/// Returns a map of model filename (e.g. ggml-tiny.bin) to SHA256 string.
fn fetch_model_sha256_map() -> Result<HashMap<String, String>, String> {
    let url = "https://huggingface.co/ggerganov/whisper.cpp/raw/main/README.md";
    let resp = reqwest::blocking::get(url).map_err(|e| format!("Failed to fetch README: {}", e))?;
    let text = resp
        .text()
        .map_err(|e| format!("Failed to read README: {}", e))?;
    let mut map = HashMap::new();
    let mut in_table = false;
    for line in text.lines() {
        if line.trim().starts_with("| Model") {
            in_table = true;
            continue;
        }
        if in_table && line.trim().starts_with("|") {
            let cols: Vec<&str> = line.split('|').map(|s| s.trim()).collect();
            if cols.len() >= 4 {
                let model = cols[1];
                let sha = cols[3].trim_matches('`');
                if !model.is_empty() && !sha.is_empty() && sha.len() == 40 {
                    let filename = format!(
                        "ggml-{}.bin",
                        model.replace('.', "-").replace('_', "-").replace("--", "-")
                    );
                    map.insert(filename, sha.to_string());
                }
            }
        } else if in_table && !line.trim().starts_with("|") {
            break; // End of table
        }
    }
    Ok(map)
}

/// Get the expected SHA256 for a given model filename (e.g. ggml-tiny.bin)
fn get_expected_sha256_for_model(model_name: &str) -> Result<String, String> {
    let sha_map = fetch_model_sha256_map()?;
    sha_map
        .get(model_name)
        .cloned()
        .ok_or_else(|| format!("No SHA256 found for model {} in README", model_name))
}

/// Compute the SHA1 of a file at the given path.
fn compute_file_sha1(path: &std::path::Path) -> Result<String, String> {
    let file =
        std::fs::File::open(path).map_err(|e| format!("Failed to open file for SHA1: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha1::new();
    let mut buffer = [0u8; 8192];
    loop {
        let n = reader
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read file for SHA1: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

/// Finalize a model download: verify checksum and rename .part to .bin if valid.
/// Updates state accordingly. Returns Ok(()) if successful, Err(reason) otherwise.
fn finalize_model_download(
    app: &AppHandle,
    model_name: &str,
    part_path: &std::path::Path,
    dest_path: &std::path::Path,
) -> Result<(), String> {
    if !part_path.exists() || dest_path.exists() {
        return Err("No .part file to finalize or .bin already exists".to_string());
    }
    let expected_sha = get_expected_sha256_for_model(model_name)?;
    let actual_sha = compute_file_sha1(part_path)?;
    if actual_sha == expected_sha {
        std::fs::rename(part_path, dest_path)
            .map_err(|e| format!("Failed to rename .part to .bin: {}", e))?;
        println!(
            "[finalize_model_download] Renamed .part to .bin for {} (SHA1 OK)",
            model_name
        );
        // Clean up any lingering .part file
        if part_path.exists() {
            let _ = std::fs::remove_file(part_path);
        }
        // Update state to Downloaded
        let mut states = MODEL_STATES.lock().unwrap();
        states.insert(
            model_name.to_string(),
            ModelDownloadState {
                status: DownloadStatus::Downloaded.to_string(),
                progress: 100,
                downloaded: 0,
                total: 0,
                error: None,
            },
        );
        save_states(app, &states);
        emit_model_states(app, &states);
        Ok(())
    } else {
        println!(
            "[finalize_model_download] ERROR: SHA1 mismatch for {}: expected {}, got {}",
            model_name, expected_sha, actual_sha
        );
        let mut states = MODEL_STATES.lock().unwrap();
        states.insert(
            model_name.to_string(),
            ModelDownloadState {
                status: DownloadStatus::Error.to_string(),
                progress: 100,
                downloaded: 0,
                total: 0,
                error: Some("SHA1 checksum mismatch after download".to_string()),
            },
        );
        save_states(app, &states);
        emit_model_states(app, &states);
        Err("SHA1 checksum mismatch after download".to_string())
    }
}
