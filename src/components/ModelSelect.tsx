import React, { useEffect, useState, useRef } from "react";
import { FaCheckCircle, FaDownload, FaTrash, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { ImSpinner2 } from "react-icons/im";
import { useModel } from "../hooks/useModel";

type ModelSelectProps = {
    models: { key: string; downloaded: boolean; downloading?: boolean }[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    disabled?: boolean;
    onDownloadModel?: (model: string) => void;
    onRemoveModel?: (model: string) => void;
};

const ModelSelect: React.FC<ModelSelectProps> = ({ models, selectedModel, setSelectedModel, disabled, onDownloadModel, onRemoveModel }) => {
    const { progressMap, setProgressMap } = useModel();
    const pollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
    const [collapsed, setCollapsed] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Clean up polling on unmount
        return () => {
            Object.values(pollingRef.current).forEach(clearInterval);
        };
    }, []);

    useEffect(() => {
        if (listRef.current) {
            setIsAnimating(true);
            const handle = () => setIsAnimating(false);
            const node = listRef.current;
            node.addEventListener('transitionend', handle);
            return () => node.removeEventListener('transitionend', handle);
        }
    }, [collapsed]);

    const startPolling = (modelKey: string) => {
        if (pollingRef.current[modelKey]) return;
        pollingRef.current[modelKey] = setInterval(async () => {
            // Simulate polling logic or integrate with backend as needed
        }, 500);
    };

    const handleDownload = (modelKey: string) => {
        setProgressMap(prev => ({ ...prev, [modelKey]: { progress: 0, status: "downloading" } }));
        if (onDownloadModel) onDownloadModel(modelKey);
        startPolling(modelKey);
    };

    return (
        <div className="mb-4">
            <div
                className={`flex items-center justify-between mb-2 ${!collapsed ? 'cursor-pointer' : ''}`}
                onClick={() => { if (!collapsed) setCollapsed(true); }}
                style={{ minHeight: '2.5rem', userSelect: 'none' }}
            >
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Model
                </span>
                {!collapsed && (
                    <span className="p-1 text-blue-500 hover:text-blue-700">
                        <FaChevronUp />
                    </span>
                )}
            </div>
            {collapsed && selectedModel ? (
                <button
                    type="button"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white/60 dark:bg-gray-900/60 shadow-sm border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500 w-full text-left"
                    onClick={() => setCollapsed(false)}
                    aria-label="Expand model list"
                >
                    <input
                        type="radio"
                        id={`model-${selectedModel}`}
                        name="model"
                        value={selectedModel}
                        checked
                        readOnly
                        className="accent-blue-500 w-4 h-4 focus:ring-2 focus:ring-blue-400 transition-all"
                        tabIndex={-1}
                    />
                    <label htmlFor={`model-${selectedModel}`} className="flex-1 cursor-pointer select-none text-base text-gray-800 dark:text-gray-100">{selectedModel}</label>
                    <span className="ml-2 text-blue-500"><FaChevronDown /></span>
                </button>
            ) : (
                <div
                    ref={listRef}
                    className={`flex flex-col gap-3 pr-1 transition-all duration-300 ease-in-out ${collapsed || isAnimating ? 'overflow-hidden' : 'overflow-auto'}`}
                    style={{ maxHeight: collapsed ? 0 : 384 }}
                >
                    {models.map(model => {
                        const progress = progressMap[model.key]?.progress ?? 0;
                        const status = progressMap[model.key]?.status ?? (model.downloading ? "downloading" : "idle");
                        const error = progressMap[model.key]?.error;
                        return (
                            <div key={model.key} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors bg-white/60 dark:bg-gray-900/60 shadow-sm ${selectedModel === model.key ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500' : 'border-gray-200 dark:border-gray-800'} ${!model.downloaded ? 'opacity-60' : 'hover:border-blue-300 cursor-pointer'}`}
                                onClick={() => {
                                    if (model.downloaded && !disabled) {
                                        setSelectedModel(model.key);
                                        setCollapsed(true);
                                    }
                                }}
                                style={{ cursor: model.downloaded && !disabled ? 'pointer' : 'default' }}
                            >
                                <input
                                    type="radio"
                                    id={`model-${model.key}`}
                                    name="model"
                                    value={model.key}
                                    checked={selectedModel === model.key}
                                    onChange={() => {
                                        setSelectedModel(model.key);
                                        setCollapsed(true);
                                    }}
                                    disabled={disabled || !model.downloaded}
                                    className="accent-blue-500 w-4 h-4 focus:ring-2 focus:ring-blue-400 transition-all"
                                    onClick={e => e.stopPropagation()}
                                />
                                <label htmlFor={`model-${model.key}`} className={`flex-1 cursor-pointer select-none text-base ${!model.downloaded ? 'text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-100'}`}>{model.key}</label>
                                {model.downloaded ? (
                                    <>
                                        <FaCheckCircle className="text-green-500" title="Downloaded" />
                                        {onRemoveModel && (
                                            <button
                                                type="button"
                                                className="p-1 text-red-500 hover:text-red-700"
                                                onClick={e => { e.stopPropagation(); onRemoveModel(model.key); }}
                                                disabled={disabled}
                                                title="Remove model"
                                            >
                                                <FaTrash />
                                            </button>
                                        )}
                                    </>
                                ) : status === "downloading" ? (
                                    <div className="flex items-center gap-2 min-w-[120px]">
                                        <ImSpinner2 className="animate-spin text-blue-500" title="Downloading..." />
                                        <div className="w-24 bg-gray-200 rounded h-2 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-2 rounded"
                                                style={{ width: `${progress}%`, transition: "width 0.2s" }}
                                            />
                                        </div>
                                        <span className="text-xs w-8 text-right">{progress}%</span>
                                    </div>
                                ) : status === "error" ? (
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-xs text-red-500">{error || "Download failed"}</span>
                                        <button
                                            type="button"
                                            className="p-1 text-blue-500 hover:text-blue-700 text-xs underline"
                                            onClick={e => { e.stopPropagation(); handleDownload(model.key); }}
                                            disabled={disabled}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="p-1 text-blue-500 hover:text-blue-700"
                                        onClick={e => { e.stopPropagation(); handleDownload(model.key); }}
                                        disabled={disabled}
                                        title="Download model"
                                    >
                                        <FaDownload />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ModelSelect; 