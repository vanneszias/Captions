import React from "react";
import { FaCheckCircle, FaDownload, FaTrash, FaRedo, FaPlay, FaPause } from "react-icons/fa";
import { ImSpinner2 } from "react-icons/im";
import type { ModelInfo } from "@/hooks/useModel";
import ModelDetailCard from "./ModelDetailCard";
import "./modelItemAnimations.css";

/**
 * Props for ModelItem component.
 */
type ModelItemProps = {
    model: ModelInfo;
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
    onDownload?: () => void;
    onRemove?: () => void;
    handleRetry?: () => void;
    onPause?: () => void;
};

/**
 * Renders a single model item with status and actions.
 */
const ModelItem: React.FC<ModelItemProps> = ({
    model,
    selected,
    onClick,
    disabled,
    onDownload,
    onRemove,
    handleRetry,
    onPause,
}) => {
    const {
        downloaded,
        downloading,
        paused,
        removing,
        error,
        progress = 0,
        status,
        resumable,
        name,
        size,
    } = model;

    // Determine text color for label
    const labelColor = selected
        ? "text-blue-700 dark:text-blue-300"
        : downloaded
            ? "text-gray-800 dark:text-gray-100"
            : "text-gray-400 dark:text-gray-600";

    // Render status/actions
    let statusContent: React.ReactNode = null;
    if (removing || status === "removing") {
        statusContent = (
            <div className="flex items-center gap-2 min-w-[120px] justify-end w-full">
                <ImSpinner2 className="animate-spin text-red-500" title="Removing..." />
                <span className="text-xs text-red-500">Removing...</span>
            </div>
        );
    } else if (status === "error") {
        statusContent = (
            <div className="flex flex-col items-end gap-1 min-w-[120px] w-full">
                <span className="text-xs text-red-500">{error || "Download failed"}</span>
                <button
                    type="button"
                    className="relative bg-white/80 dark:bg-gray-900/80 rounded-full p-2 shadow hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors flex-shrink-0 transition-transform duration-150 hover:scale-110 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] focus:shadow-[0_0_8px_2px_rgba(59,130,246,0.7)] text-blue-500 text-xs underline"
                    onClick={e => { e.stopPropagation(); handleRetry && handleRetry(); }}
                    disabled={disabled}
                >
                    <span className="hover:animate-shake">Retry</span>
                </button>
            </div>
        );
    } else if (downloading) {
        statusContent = (
            <div className="flex items-center gap-2 justify-end min-w-[220px] w-full">
                <div className="flex items-center gap-2 order-2">
                    {onPause && (
                        <button
                            type="button"
                            className="relative bg-white/80 dark:bg-gray-900/80 rounded-full p-2 shadow hover:bg-yellow-100 dark:hover:bg-yellow-900 transition-colors flex-shrink-0 transition-transform duration-150 hover:scale-110 hover:shadow-[0_0_8px_2px_rgba(253,224,71,0.5)] focus:shadow-[0_0_8px_2px_rgba(253,224,71,0.7)] text-yellow-600 ml-2"
                            onClick={e => { e.stopPropagation(); onPause(); }}
                            disabled={disabled}
                            title="Pause download"
                        >
                            <FaPause className="hover:animate-shake" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 order-1">
                    <ImSpinner2 className="animate-spin text-blue-500" title="Downloading..." />
                    <span className="text-xs w-8 text-right">{progress}%</span>
                    <div className="w-24 bg-gray-200 rounded h-2 overflow-hidden">
                        <div
                            className="bg-blue-500 h-2 rounded"
                            style={{ width: `${progress}%`, transition: "width 0.2s" }}
                        />
                    </div>
                </div>
            </div>
        );
    } else if (paused) {
        statusContent = (
            <button
                type="button"
                className="relative bg-white/80 dark:bg-gray-900/80 rounded-full p-2 shadow hover:bg-green-100 dark:hover:bg-green-900 transition-colors flex-shrink-0 transition-transform duration-150 hover:scale-110 hover:shadow-[0_0_8px_2px_rgba(34,197,94,0.5)] focus:shadow-[0_0_8px_2px_rgba(34,197,94,0.7)] text-green-600"
                onClick={e => { e.stopPropagation(); onDownload && onDownload(); }}
                disabled={disabled}
                title="Resume download"
            >
                <FaPlay className="hover:animate-shake" />
            </button>
        );
    } else if (downloaded) {
        statusContent = (
            <div className="flex items-center gap-2 justify-end min-w-[120px] w-full">
                <FaCheckCircle className="text-green-500" title="Downloaded" />
                {onRemove && (
                    <button
                        type="button"
                        className="relative bg-white/80 dark:bg-gray-900/80 rounded-full p-2 shadow hover:bg-red-100 dark:hover:bg-red-900 transition-colors flex-shrink-0 transition-transform duration-150 hover:scale-110 hover:shadow-[0_0_8px_2px_rgba(239,68,68,0.5)] focus:shadow-[0_0_8px_2px_rgba(239,68,68,0.7)] text-red-500"
                        onClick={e => { e.stopPropagation(); onRemove(); }}
                        disabled={disabled}
                        title="Remove model"
                    >
                        <FaTrash className="text-red-500 hover:animate-shake" />
                    </button>
                )}
            </div>
        );
    } else {
        statusContent = (
            <button
                type="button"
                className="relative bg-white/80 dark:bg-gray-900/80 rounded-full p-2 shadow hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors flex-shrink-0 transition-transform duration-150 hover:scale-110 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] focus:shadow-[0_0_8px_2px_rgba(59,130,246,0.7)] text-blue-500"
                onClick={e => { e.stopPropagation(); onDownload && onDownload(); }}
                disabled={disabled}
                title={resumable ? "Resume download" : "Download model"}
            >
                {resumable ? <FaRedo className="hover:animate-shake" /> : <FaDownload className="hover:animate-shake" />}
            </button>
        );
    }

    return (
        <button
            type="button"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors bg-white/60 dark:bg-gray-900/60 shadow-sm text-left w-full
                ${selected ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500' : 'border-gray-200 dark:border-gray-800'}
                hover:border-blue-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900
                ${!downloaded ? 'opacity-60' : ''} z-20 relative overflow-visible`}
            onClick={downloaded && !disabled ? onClick : undefined}
            disabled={disabled}
            aria-pressed={selected}
        >
            <label
                htmlFor={`model-${model.key}`}
                className={`flex-1 cursor-pointer select-none text-base ${labelColor}`}
            >
                {name.includes("-") ? name.split("-")[0] : name}
                <ModelDetailCard name={model.name} size={size} />
            </label>
            {statusContent}
        </button>
    );
};

export default ModelItem; 