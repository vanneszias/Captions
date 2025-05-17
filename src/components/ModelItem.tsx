import React from "react";
import { FaCheckCircle, FaDownload, FaTrash } from "react-icons/fa";
import { ImSpinner2 } from "react-icons/im";

type Model = {
    key: string;
    downloaded: boolean;
    downloading?: boolean;
};

type ModelItemProps = {
    model: Model;
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
    onDownload?: () => void;
    onRemove?: () => void;
    progress?: number;
    status?: string;
    error?: string;
    handleRetry?: () => void;
};

const ModelItem: React.FC<ModelItemProps> = ({
    model,
    selected,
    onClick,
    disabled,
    onDownload,
    onRemove,
    progress = 0,
    status = "idle",
    error,
    handleRetry
}) => {
    // Determine text color for label
    const labelColor = selected
        ? "text-blue-700 dark:text-blue-300"
        : model.downloaded
            ? "text-gray-800 dark:text-gray-100"
            : "text-gray-400 dark:text-gray-600";

    return (
        <button
            type="button"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors bg-white/60 dark:bg-gray-900/60 shadow-sm text-left w-full
                ${selected ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500' : 'border-gray-200 dark:border-gray-800'}
                hover:border-blue-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900
                ${!model.downloaded ? 'opacity-60' : ''}`}
            onClick={model.downloaded && !disabled ? onClick : undefined}
            disabled={disabled}
            aria-pressed={selected}
        >
            <label
                htmlFor={`model-${model.key}`}
                className={`flex-1 cursor-pointer select-none text-base ${labelColor}`}
            >
                {model.key}
            </label>
            {/* Status/Actions */}
            {model.downloaded ? (
                <div className="flex items-center gap-2">
                    <FaCheckCircle className="text-green-500" title="Downloaded" />
                    {onRemove && (
                        <button
                            type="button"
                            className="p-1 text-red-500 hover:text-red-700"
                            onClick={e => { e.stopPropagation(); onRemove(); }}
                            disabled={disabled}
                            title="Remove model"
                        >
                            <FaTrash />
                        </button>
                    )}
                </div>
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
                        onClick={e => { e.stopPropagation(); handleRetry && handleRetry(); }}
                        disabled={disabled}
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    className="p-1 text-blue-500 hover:text-blue-700"
                    onClick={e => { e.stopPropagation(); onDownload && onDownload(); }}
                    disabled={disabled}
                    title="Download model"
                >
                    <FaDownload />
                </button>
            )}
        </button>
    );
};

export default ModelItem; 