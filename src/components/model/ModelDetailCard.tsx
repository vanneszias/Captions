import React from "react";

// Model details mapping
const MODEL_DETAILS: Record<string, { size: string; recommendedText?: string }> = {
    tiny: { size: "74 MB", recommendedText: "Best for speed" },
    base: { size: "141 MB" },
    small: { size: "465 MB", recommendedText: "Best for balance" },
    medium: { size: "1.4 GB" },
    "large-v3-turbo": { size: "1.5 GB", recommendedText: "Best for quality" },
};

export interface ModelDetailCardProps {
    name: string;
    size?: string;
}

const ModelDetailCard: React.FC<ModelDetailCardProps> = ({ name, size }) => {
    // Remove ggml- prefix and .bin suffix if present
    const cleanName = name.replace(/^ggml-/, "").replace(/\.bin$/, "");
    const details = MODEL_DETAILS[cleanName] || { size: "?" };
    const displaySize = size || details.size;

    return (
        <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-mono">{displaySize}</span>
            {details.recommendedText && (
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded font-semibold w-fit whitespace-nowrap">
                    {details.recommendedText}
                </span>
            )}
        </div>
    );
};

export default ModelDetailCard; 