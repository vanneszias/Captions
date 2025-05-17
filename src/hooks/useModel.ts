import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type ModelStatus = "downloaded" | "not-downloaded" | "downloading";

export interface ModelInfo {
    name: string;
    url?: string;
    status: ModelStatus;
}

export function useModel() {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [downloading, setDownloading] = useState<string | null>(null);
    const [progressMap, setProgressMap] = useState<Record<string, { progress: number; status: string; error?: string }>>({});

    const fetchModels = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [local, remote]: [string[], { name: string; url: string }[]] = await Promise.all([
                invoke<string[]>("list_models"),
                invoke<{ name: string; url: string }[]>("list_remote_models"),
            ]);
            const localSet = new Set(local);
            const allModels: ModelInfo[] = remote.map((r) => ({
                name: r.name,
                url: r.url,
                status: localSet.has(`ggml-${r.name}.bin`) ? "downloaded" : "not-downloaded",
            }));
            setModels(allModels);
        } catch (err: any) {
            setError(err?.toString() || "Failed to fetch models");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        listen<{ model: string; progress: number }>("model-download-progress", (event) => {
            let { model, progress } = event.payload;
            if (model.startsWith("ggml-") && model.endsWith(".bin")) {
                model = model.slice(5, -4);
            }
            setProgressMap(prev => {
                const updated = {
                    ...prev,
                    [model]: {
                        ...(prev[model] || { status: "downloading", progress: 0 }),
                        progress,
                        status: progress >= 100 ? "downloaded" : "downloading",
                    },
                };
                return updated;
            });
        }).then((fn) => {
            unlisten = fn;
        });
        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    const downloadModel = useCallback(async (modelName: string) => {
        setDownloading(modelName);
        setError("");
        try {
            await invoke("download_model", { modelName: `ggml-${modelName}.bin` });
            await fetchModels();
        } catch (err: any) {
            setError(err?.toString() || "Failed to download model");
        } finally {
            setDownloading(null);
        }
    }, [fetchModels]);

    const removeModel = useCallback(async (modelName: string) => {
        console.log('[removeModel] called with', modelName);
        setError("");
        try {
            await invoke("remove_model", { modelName: `ggml-${modelName}.bin` });
            console.log('[removeModel] Successfully removed', modelName);
            await fetchModels();
        } catch (err: any) {
            console.error('[removeModel] Error removing', modelName, err);
            setError(err?.toString() || "Failed to remove model");
        }
    }, [fetchModels]);

    return { models, loading, error, downloading, fetchModels, downloadModel, progressMap, setProgressMap, removeModel };
} 