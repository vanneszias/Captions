import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface RunWhisperArgs {
    model: string | null;
    audio: { name: string; path: string };
    language: string;
}

/**
 * Validates the arguments for running Whisper.
 * @param args - The arguments to validate.
 * @returns An error string if invalid, or null if valid.
 */
function validateWhisperArgs(args: RunWhisperArgs): string | null {
    if (!args.model) return "No model selected";
    if (!args.audio?.path) return "Audio file path is missing.";
    if (!args.language) return "Language is missing.";
    return null;
}

/**
 * Hook for running Whisper transcription via Tauri backend.
 * Provides output, error, loading state, and a runWhisper function.
 */
export function useWhisper() {
    const [output, setOutput] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);

    /**
     * Runs Whisper transcription with the given arguments.
     * @param args - The arguments for transcription.
     */
    async function runWhisper(args: RunWhisperArgs) {
        setError("");
        setOutput("");
        const validationError = validateWhisperArgs(args);
        if (validationError) {
            setError(validationError);
            return;
        }
        setLoading(true);
        try {
            const result = await invoke<string>("transcribe_file", {
                inputPath: args.audio.path,
                model: args.model,
                language: args.language,
            });
            setOutput(prev => (prev !== result ? result : prev));
        } catch (err: any) {
            setError(err?.toString() || "Failed to run whisper");
        } finally {
            setLoading(false);
        }
    }

    return { output, error, loading, runWhisper };
} 