import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface RunWhisperArgs {
    model: string | null;
    audio: { name: string; path: string };
    language: string;
}

export function useWhisper() {
    const [output, setOutput] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);

    async function runWhisper({ model, audio, language }: RunWhisperArgs) {
        setError("");
        setOutput("");
        if (!model) {
            setError("No model selected");
            return;
        }
        const filePath = audio.path;
        if (!filePath) {
            setError("Audio file path is missing.");
            return;
        }
        setLoading(true);
        console.log("Invoking transcribe_file with", {
            inputPath: filePath,
            model: model,
            language,
        });
        try {
            const result = await invoke<string>("transcribe_file", {
                inputPath: filePath,
                model: model,
                language,
            });
            setOutput(result);
        } catch (err: any) {
            setError(err?.toString() || "Failed to run whisper");
        } finally {
            setLoading(false);
        }
    }

    return { output, error, loading, runWhisper };
} 