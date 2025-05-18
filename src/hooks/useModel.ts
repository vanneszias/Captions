import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/**
 * Possible statuses for a model.
 */
export type ModelStatus =
    | "downloaded"
    | "not-downloaded"
    | "downloading"
    | "paused"
    | "error"
    | "removing";

/**
 * Information about a model, including status and progress.
 */
export interface ModelInfo {
    name: string;
    url?: string;
    size?: string;
    status: ModelStatus;
    resumable?: boolean;
    paused?: boolean;
    error?: string;
    progress?: number;
    removing?: boolean;
    key: string;
    downloaded: boolean;
    downloading: boolean;
}

/**
 * Deep compare two arrays of ModelInfo for equality.
 */
function modelsEqual(a: ModelInfo[], b: ModelInfo[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const x = a[i], y = b[i];
        if (
            x.key !== y.key ||
            x.status !== y.status ||
            x.progress !== y.progress ||
            x.error !== y.error ||
            x.paused !== y.paused ||
            x.removing !== y.removing ||
            x.downloaded !== y.downloaded ||
            x.downloading !== y.downloading
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Fetches the list of models and their statuses from the backend.
 */
async function fetchModelData(): Promise<ModelInfo[]> {
    const [local, remote, backendStatesRaw]: [string[], { name: string; url: string; size: string }[], unknown] = await Promise.all([
        invoke<string[]>("list_models"),
        invoke<{ name: string; url: string; size: string }[]>("list_remote_models"),
        invoke("get_model_states", { app: undefined }),
    ]);
    // Filter out model_states.json
    const filteredLocal = local.filter(name => name.endsWith(".bin"));
    // Build a map of local models for easy lookup
    const localSet = new Set(filteredLocal);
    // Build a map of backend states
    const backendStates = backendStatesRaw as Record<string, { status: string; progress: number; error?: string; downloaded?: number; total?: number }>;
    // 1. Add all remote models in the order sent by the server
    const allModels: ModelInfo[] = remote.map(r => {
        const modelFile = `ggml-${r.name}.bin`;
        let status: ModelStatus = localSet.has(modelFile) ? "downloaded" : "not-downloaded";
        let resumable = false;
        let paused = false;
        let error: string | undefined = undefined;
        let progress: number | undefined = undefined;
        let removing = false;
        // Merge in backendStates
        const backend = backendStates[modelFile];
        if (backend) {
            status = backend.status as ModelStatus;
            progress = backend.progress;
            error = backend.error;
            if (status === "paused") paused = true;
            if (status === "removing") removing = true;
        }
        return {
            key: modelFile,
            name: r.name,
            url: r.url,
            size: r.size,
            status,
            resumable,
            paused,
            error,
            progress,
            removing,
            downloaded: status === "downloaded",
            downloading: status === "downloading",
        };
    });
    // 2. Add any extra local models not present in remote
    const remoteModelFiles = new Set(remote.map(r => `ggml-${r.name}.bin`));
    filteredLocal.forEach(modelFile => {
        if (!remoteModelFiles.has(modelFile)) {
            let status: ModelStatus = "downloaded";
            let resumable = false;
            let paused = false;
            let error: string | undefined = undefined;
            let progress: number | undefined = undefined;
            let removing = false;
            const backend = backendStates[modelFile];
            if (backend) {
                status = backend.status as ModelStatus;
                progress = backend.progress;
                error = backend.error;
                if (status === "paused") paused = true;
                if (status === "removing") removing = true;
            }
            allModels.push({
                key: modelFile,
                name: modelFile.replace(/^ggml-/, "").replace(/\.bin$/, ""),
                url: undefined,
                size: undefined,
                status,
                resumable,
                paused,
                error,
                progress,
                removing,
                downloaded: status === "downloaded",
                downloading: status === "downloading",
            });
        }
    });
    return allModels;
}

/**
 * Hook for managing Whisper model downloads and state.
 * Only updates state when the model list or statuses actually change.
 */
export function useModel() {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [downloading, setDownloading] = useState<string | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Fetch and update models only if changed
    const updateModels = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const newModels = await fetchModelData();
            setModels(prev => (modelsEqual(prev, newModels) ? prev : newModels));
        } catch (err: any) {
            setError(err?.toString() || "Failed to fetch models");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        updateModels();
    }, [updateModels]);

    // Listen for backend model state updates
    useEffect(() => {
        let unlistenStates: (() => void) | undefined;
        listen<{ states: Record<string, { status: string; progress: number; error?: string; downloaded?: number; total?: number }> }>(
            "model-states-updated",
            () => {
                const now = Date.now();
                if (now - lastUpdateRef.current < 500) return;
                lastUpdateRef.current = now;
                updateModels();
            }
        ).then((fn) => {
            unlistenStates = fn;
        });
        return () => {
            if (unlistenStates) unlistenStates();
        };
    }, [updateModels]);

    // Action handlers
    /**
     * Start downloading a model.
     */
    const downloadModel = useCallback(async (modelKey: string) => {
        setDownloading(modelKey);
        setError("");
        try {
            await invoke("download_model", { modelName: modelKey });
            await updateModels();
        } catch (err: any) {
            setError(err?.toString() || "Failed to download model");
        } finally {
            setDownloading(null);
        }
    }, [updateModels]);

    /**
     * Pause a model download.
     */
    const pauseModelDownload = useCallback(async (modelKey: string) => {
        try {
            await invoke("pause_model_download", { modelName: modelKey });
            await updateModels();
        } catch (err: any) {
            setError(err?.toString() || "Failed to pause download");
        }
    }, [updateModels]);

    /**
     * Retry a failed model download.
     */
    const retryModelDownload = useCallback(async (modelKey: string) => {
        await downloadModel(modelKey);
    }, [downloadModel]);

    /**
     * Remove a model (downloaded or in-progress).
     */
    const removeModel = useCallback(async (modelKey: string) => {
        setError("");
        try {
            await invoke("remove_model", { modelName: modelKey });
            await updateModels();
        } catch (err: any) {
            setError(err?.toString() || "Failed to remove model");
        }
    }, [updateModels]);

    return {
        models,
        loading,
        error,
        downloading,
        fetchModels: updateModels,
        downloadModel,
        pauseModelDownload,
        retryModelDownload,
        removeModel,
    };
} 