import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

/**
 * Checks if a string looks like SRT format.
 */
function looksLikeSrt(subtitle: string): boolean {
    // SRT files have lines like: 1\n00:00:01,000 --> 00:00:04,000\nText
    return /^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/m.test(subtitle);
}

/**
 * Checks if a string looks like Whisper format.
 */
function looksLikeWhisper(line: string): boolean {
    // [00:00:00.000 --> 00:00:03.440]   text
    return /^\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/m.test(line);
}

/**
 * Converts Whisper output to SRT using the backend.
 */
async function convertWhisperToSrt(subtitle: string): Promise<string> {
    return invoke<string>("whisper_to_srt", { whisperOutput: subtitle });
}

/**
 * Filters timestamps from SRT content using the backend.
 */
async function filterSrtTimestamps(srtContent: string): Promise<string> {
    return invoke<string>("filter_srt_timestamps", { srtContent });
}

/**
 * Hook for processing and downloading subtitles.
 * Handles SRT/Whisper conversion, timestamp filtering, and SRT download.
 */
export function useSubtitles(subtitle: string, filterTimestamps: boolean, videoFilename?: string) {
    const [displaySubtitle, setDisplaySubtitle] = useState(subtitle || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setError(null);
        async function processSubtitle() {
            let newDisplay = subtitle || "";
            if (filterTimestamps && subtitle) {
                if (looksLikeSrt(subtitle)) {
                    setLoading(true);
                    try {
                        const result = await filterSrtTimestamps(subtitle);
                        newDisplay = result || "(No subtitle text found)";
                    } catch (err) {
                        newDisplay = "(Failed to filter timestamps: " + (err?.toString?.() || err) + ")";
                    } finally {
                        setLoading(false);
                    }
                } else if (looksLikeWhisper(subtitle)) {
                    setLoading(true);
                    try {
                        const srtContent = await convertWhisperToSrt(subtitle);
                        const result = await filterSrtTimestamps(srtContent);
                        newDisplay = result || "(No subtitle text found)";
                    } catch (err) {
                        newDisplay = "(Failed to convert/filter: " + (err?.toString?.() || err) + ")";
                    } finally {
                        setLoading(false);
                    }
                } else {
                    newDisplay = "(Timestamp filtering only works for SRT or Whisper subtitles.)";
                    setLoading(false);
                }
            }
            setDisplaySubtitle(prev => (prev !== newDisplay ? newDisplay : prev));
        }
        processSubtitle();
    }, [filterTimestamps, subtitle]);

    /**
     * Downloads the current subtitle as an SRT file.
     */
    const downloadSrt = async () => {
        let srtContent = subtitle;
        if (!looksLikeSrt(subtitle) && looksLikeWhisper(subtitle)) {
            // Convert whisper format to SRT using backend
            try {
                srtContent = await convertWhisperToSrt(subtitle);
            } catch (err) {
                alert("Failed to convert to SRT: " + (err?.toString?.() || err));
                return;
            }
        }
        if (!srtContent) {
            alert("No subtitle to download");
            return;
        }
        // Use Tauri dialog to pick save location
        let defaultSrtName = "transcription.srt";
        if (videoFilename) {
            const base = videoFilename.replace(/\.[^/.]+$/, "");
            defaultSrtName = base + ".srt";
        }
        const savePath = await save({
            defaultPath: defaultSrtName,
            filters: [{ name: "SRT Subtitles", extensions: ["srt"] }],
        });
        if (!savePath) return; // User cancelled
        try {
            const encoded = new TextEncoder().encode(srtContent);
            await writeFile(savePath, encoded);
        } catch (err) {
            alert("Failed to save SRT file: " + (err?.toString?.() || err));
        }
    };

    return { displaySubtitle, loading, error, downloadSrt };
}
