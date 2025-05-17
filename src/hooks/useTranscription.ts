import { useState, useEffect } from "react";
import { useModel } from "./useModel";
import { useWhisper } from "./useWhisper";
import { message } from '@tauri-apps/plugin-dialog';

export function useTranscription() {
    const [filePath, setFilePath] = useState<string | null>(null);
    const [language, setLanguage] = useState<string>("en"); // Default language
    const {
        models,
        loading: modelsLoading,
        error: modelsError,
        downloading,
        downloadModel,
        removeModel,
    } = useModel();
    const [selectedModel, setSelectedModel] = useState<string>("");
    const { output: subtitle, error: whisperError, loading: whisperLoading, runWhisper } = useWhisper();
    const [error, setError] = useState<string>("");

    // Set default selected model when models load
    useEffect(() => {
        if (models.length > 0 && !selectedModel) {
            const firstDownloaded = models.find(m => m.status === "downloaded");
            const chosen = firstDownloaded ? firstDownloaded.name : models[0].name;
            setSelectedModel(chosen);
        }
    }, [models, selectedModel]);

    const handleUpload = async () => {
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
                model: `ggml-${selectedModel}.bin`,
                audio: { name: audioName, path: filePath as string },
                language,
            });
        } catch (whisperErr) {
            setError("Failed to run whisper: " + whisperErr?.toString());
            await message(`Error in runWhisper: ${whisperErr}`, { title: "Whisper Error" });
        }
    };

    return {
        filePath,
        setFilePath,
        models: models.map(m => ({ key: m.name, downloaded: m.status === "downloaded", downloading: downloading === m.name })),
        selectedModel,
        setSelectedModel,
        uploading: whisperLoading,
        handleUpload,
        subtitle,
        error: error || whisperError || modelsError,
        onDownloadModel: (modelName: string) => downloadModel(modelName),
        onRemoveModel: (modelName: string) => removeModel(modelName),
        language,
        setLanguage,
        modelsLoading,
    };
} 