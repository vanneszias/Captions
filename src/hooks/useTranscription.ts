import { useState, useEffect, useCallback } from "react";
import { useModel } from "./useModel";
import { useWhisper } from "./useWhisper";
import { message } from '@tauri-apps/plugin-dialog';

/**
 * Hook for managing transcription state and actions.
 * Handles file selection, model selection, language, and running Whisper.
 */
export function useTranscription() {
    const [filePath, setFilePath] = useState<string | null>(null);
    const [language, setLanguage] = useState<string>("en"); // Default language
    const {
        models,
        loading: modelsLoading,
        error: modelsError,
        downloadModel,
        removeModel,
        pauseModelDownload,
    } = useModel();
    const [selectedModel, setSelectedModel] = useState<string>("");
    const { output: subtitle, error: whisperError, loading: whisperLoading, runWhisper } = useWhisper();
    const [error, setError] = useState<string>("");

    /**
     * Selects the default model when models are loaded.
     */
    useEffect(() => {
        if (models.length > 0 && !selectedModel) {
            const firstDownloaded = models.find(m => m.status === "downloaded");
            const chosen = firstDownloaded ? firstDownloaded.key : models[0].key;
            if (chosen !== selectedModel) setSelectedModel(chosen);
        }
    }, [models, selectedModel]);

    /**
     * Handles uploading and running Whisper transcription.
     */
    const handleUpload = useCallback(async () => {
        setError("");
        if (!filePath) {
            setError("No file selected");
            return;
        }
        if (!selectedModel) {
            setError("No model selected");
            return;
        }
        try {
            const audioName = (typeof filePath === 'string' && filePath.split('/').pop()) ? filePath.split('/').pop()! : 'file';
            await runWhisper({
                model: selectedModel,
                audio: { name: audioName, path: filePath as string },
                language,
            });
        } catch (whisperErr) {
            setError("Failed to run whisper: " + whisperErr?.toString());
            await message(`Error in runWhisper: ${whisperErr}`, { title: "Whisper Error" });
        }
    }, [filePath, selectedModel, language, runWhisper]);

    return {
        filePath,
        setFilePath,
        models,
        selectedModel,
        setSelectedModel,
        uploading: whisperLoading,
        handleUpload,
        subtitle,
        error: error || whisperError || modelsError,
        onDownloadModel: (modelKey: string) => downloadModel(modelKey),
        onRemoveModel: (modelKey: string) => removeModel(modelKey),
        pauseModelDownload,
        language,
        setLanguage,
        modelsLoading,
    };
} 