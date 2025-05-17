use std::io::Read;
use std::process::Command;
use tauri::path::BaseDirectory;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;

#[derive(serde::Serialize)]
pub struct RemoteModel {
    pub name: String,
    pub url: String,
}

#[tauri::command]
pub fn run_whisper_cli(args: Vec<String>, app: AppHandle) -> Result<String, String> {
    println!("[run_whisper_cli] called with args: {:?}", args);
    let bin_path = app
        .path()
        .resolve("gen/whisper-bin/whisper", BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    let output = Command::new(bin_path).args(&args).output().map_err(|e| {
        println!("[run_whisper_cli] Failed to start whisper CLI: {}", e);
        format!("Failed to start whisper CLI: {}", e)
    })?;
    if output.status.success() {
        println!("[run_whisper_cli] Success");
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        println!(
            "[run_whisper_cli] whisper CLI failed: {}\n{}",
            String::from_utf8_lossy(&output.stderr),
            String::from_utf8_lossy(&output.stdout)
        );
        Err(format!(
            "whisper CLI failed: {}\n{}",
            String::from_utf8_lossy(&output.stderr),
            String::from_utf8_lossy(&output.stdout)
        ))
    }
}

fn get_models_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("models")
}

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
pub async fn download_model(app: AppHandle, model_name: String) -> Result<(), String> {
    println!("[download_model] called with model_name: {}", model_name);
    use futures_util::StreamExt;
    use reqwest::Client;
    use tokio::fs as async_fs;
    use tokio::io::AsyncWriteExt;

    let url = format!(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{}",
        model_name
    );
    let models_dir = get_models_dir(&app);
    if !models_dir.exists() {
        if let Err(e) = std::fs::create_dir_all(&models_dir) {
            println!("[download_model] Failed to create models dir: {}", e);
            return Err(format!("Failed to create models dir: {}", e));
        }
    }
    let dest_path = models_dir.join(&model_name);
    let client = Client::new();
    let resp = client.get(&url).send().await.map_err(|e| {
        println!("[download_model] Failed to download: {}", e);
        format!("Failed to download: {}", e)
    })?;
    let total_size = resp.content_length().unwrap_or(0);
    let mut stream = resp.bytes_stream();
    let mut file = async_fs::File::create(&dest_path).await.map_err(|e| {
        println!("[download_model] Failed to create file: {}", e);
        format!("Failed to create file: {}", e)
    })?;
    let mut downloaded: u64 = 0;
    let mut last_emit = std::time::Instant::now();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| {
            println!("[download_model] Failed to read chunk: {}", e);
            format!("Failed to read chunk: {}", e)
        })?;
        let chunk_size = chunk.len();
        file.write_all(&chunk).await.map_err(|e| {
            println!("[download_model] Failed to write file: {}", e);
            format!("Failed to write file: {}", e)
        })?;
        downloaded += chunk_size as u64;
        let progress = if total_size > 0 {
            (downloaded as f64 / total_size as f64 * 100.0).round() as u64
        } else {
            0
        };
        if last_emit.elapsed().as_secs_f64() >= 1.0 || progress >= 100 {
            let _ = app.emit(
                "model-download-progress",
                serde_json::json!({
                    "model": model_name,
                    "progress": progress,
                }),
            );
            last_emit = std::time::Instant::now();
        }
    }
    // Always emit 100% at the end
    let _ = app.emit(
        "model-download-progress",
        serde_json::json!({
            "model": model_name,
            "progress": 100,
        }),
    );
    println!(
        "[download_model] Model downloaded successfully: {}",
        model_name
    );
    Ok(())
}

#[tauri::command]
pub async fn transcribe_file(
    app: AppHandle,
    input_path: String,
    model: String,
    language: String,
) -> Result<String, String> {
    println!(
        "[transcribe_file] called with input_path: {}, model: {}, language: {}",
        input_path, model, language
    );
    use std::path::Path;
    let ext = Path::new(&input_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let is_audio = matches!(ext.as_str(), "wav" | "flac" | "mp3" | "ogg" | "m4a");
    let bin_path = app
        .path()
        .resolve("gen/whisper-bin/whisper", BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    let ffmpeg_path = app
        .path()
        .resolve("gen/ffmpeg-bin/ffmpeg", BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    let model_path = get_models_dir(&app).join(&model);
    let mut args = vec![
        "-m".into(),
        model_path.to_string_lossy().to_string(),
        "-l".into(),
        language.clone(),
    ];
    if is_audio && ext == "wav" {
        args.push("-f".into());
        args.push(input_path.clone());
        println!(
            "[transcribe_file] Running whisper CLI with args: {:?}",
            args
        );
        let output = std::process::Command::new(&bin_path)
            .args(&args)
            .output()
            .map_err(|e| {
                println!("[transcribe_file] Failed to start whisper CLI: {}", e);
                format!("Failed to start whisper CLI: {}", e)
            })?;
        if output.status.success() {
            println!("[transcribe_file] Success");
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            println!(
                "[transcribe_file] whisper CLI failed: {}\n{}",
                String::from_utf8_lossy(&output.stderr),
                String::from_utf8_lossy(&output.stdout)
            );
            Err(format!(
                "whisper CLI failed: {}\n{}",
                String::from_utf8_lossy(&output.stderr),
                String::from_utf8_lossy(&output.stdout)
            ))
        }
    } else {
        println!("[transcribe_file] Using ffmpeg CLI to convert input");
        // Use bundled ffmpeg binary
        let mut ffmpeg = std::process::Command::new(&ffmpeg_path)
            .args([
                "-i",
                &input_path,
                "-f",
                "wav",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-",
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| {
                println!("[transcribe_file] Failed to start ffmpeg: {}", e);
                format!("Failed to start ffmpeg: {}", e)
            })?;
        args.push("-f".into());
        args.push("-".into()); // Read from stdin
        println!(
            "[transcribe_file] Running whisper CLI with args: {:?}",
            args
        );
        let mut whisper = std::process::Command::new(&bin_path)
            .args(&args)
            .stdin(ffmpeg.stdout.take().unwrap())
            .stdout(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| {
                println!("[transcribe_file] Failed to start whisper CLI: {}", e);
                format!("Failed to start whisper CLI: {}", e)
            })?;
        let mut output = String::new();
        if let Some(mut out) = whisper.stdout.take() {
            if let Err(e) = out.read_to_string(&mut output) {
                println!("[transcribe_file] Failed to read whisper output: {}", e);
                return Err(format!("Failed to read whisper output: {}", e));
            }
        }
        let status = whisper.wait().map_err(|e| {
            println!("[transcribe_file] Failed to wait for whisper: {}", e);
            format!("Failed to wait for whisper: {}", e)
        })?;
        if status.success() {
            println!("[transcribe_file] Success");
            Ok(output)
        } else {
            println!("[transcribe_file] whisper CLI failed");
            Err(format!("whisper CLI failed"))
        }
    }
}

#[tauri::command]
pub fn list_remote_models() -> Vec<RemoteModel> {
    println!("[list_remote_models] called");
    vec![
        RemoteModel {
            name: "tiny".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"
                .to_string(),
        },
        RemoteModel {
            name: "base".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
                .to_string(),
        },
        RemoteModel {
            name: "small".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
                .to_string(),
        },
        RemoteModel {
            name: "medium".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin"
                .to_string(),
        },
        RemoteModel {
            name: "large-v3-turbo".to_string(),
            url:
                "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"
                    .to_string(),
        },
    ]
}

#[tauri::command]
pub fn remove_model(app: AppHandle, model_name: String) -> Result<(), String> {
    println!("[remove_model] called with model_name: {}", model_name);
    let models_dir = get_models_dir(&app);
    let model_path = models_dir.join(&model_name);
    println!("[remove_model] full path: {}", model_path.display());
    match std::fs::remove_file(&model_path) {
        Ok(_) => {
            println!(
                "[remove_model] Successfully removed: {}",
                model_path.display()
            );
            Ok(())
        }
        Err(e) => {
            println!(
                "[remove_model] Failed to remove: {} - {}",
                model_path.display(),
                e
            );
            Err(format!("Failed to remove model: {}", e))
        }
    }
}
