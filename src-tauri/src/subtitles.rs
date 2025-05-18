//! Utilities for working with subtitle formats and conversions.

use regex::Regex;
use srtlib::Subtitles;
use std::error::Error;

/// Extracts only the text from an SRT string, removing timestamps and sequence numbers.
///
/// # Arguments
/// * `srt_content` - The SRT file content as a string.
///
/// # Returns
/// * `Ok(String)` - The extracted subtitle text.
/// * `Err(Box<dyn Error>)` - If parsing fails.
fn srt_text_only(srt_content: &str) -> Result<String, Box<dyn Error>> {
    let subs = Subtitles::parse_from_str(srt_content.to_string())?;
    let mut result = String::new();
    for sub in subs {
        result.push_str(&sub.text);
        result.push('\n');
    }
    Ok(result.trim().to_string())
}

/// Tauri command: Remove timestamps and sequence numbers from SRT content, returning only the text.
#[tauri::command]
pub fn filter_srt_timestamps(srt_content: String) -> Result<String, String> {
    srt_text_only(&srt_content).map_err(|e| e.to_string())
}

/// Helper to get the regex for parsing Whisper output lines.
fn whisper_srt_regex() -> Regex {
    Regex::new(
        r"^\[(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})\]\s*(.*)$",
    )
    .expect("Failed to compile Whisper SRT regex")
}

/// Converts Whisper output format to SRT string.
///
/// # Arguments
/// * `whisper_output` - The output from Whisper as a string.
///
/// # Returns
/// * `Ok(String)` - The SRT formatted string.
/// * `Err(String)` - If parsing fails or no valid lines are found.
#[tauri::command]
pub fn whisper_to_srt(whisper_output: String) -> Result<String, String> {
    let re = whisper_srt_regex();
    let mut srt = String::new();
    let mut idx = 1;
    for line in whisper_output.lines() {
        if let Some(caps) = re.captures(line) {
            let start = format!("{}:{}:{},{}", &caps[1], &caps[2], &caps[3], &caps[4]);
            let end = format!("{}:{}:{},{}", &caps[5], &caps[6], &caps[7], &caps[8]);
            // Convert . to , for SRT
            let start = start.replace('.', ",");
            let end = end.replace('.', ",");
            let text = caps[9].trim();
            srt.push_str(&format!("{}\n{} --> {}\n{}\n\n", idx, start, end, text));
            idx += 1;
        }
    }
    if srt.is_empty() {
        return Err("No valid lines found in whisper output".to_string());
    }
    Ok(srt.trim().to_string())
}
