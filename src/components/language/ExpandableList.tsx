import React, { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Props for TranscriptionResult component.
 */
type ExpandableListProps = {
    subtitle: string;
    error: string;
    onDownloadSrt?: () => void;
};

/**
 * Renders the transcription result, including subtitle text, error, and actions.
 */
const ExpandableList: React.FC<ExpandableListProps> = ({ subtitle, error, onDownloadSrt }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if (subtitle) {
            navigator.clipboard.writeText(subtitle);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        }
    };
    return (
        <div className="mt-6">
            {error && <p className="text-red-600 font-medium mb-2">{error}</p>}
            {subtitle && (
                <div className="relative">
                    <pre className="p-4 bg-white/80 dark:bg-gray-900/80 border rounded-lg text-left whitespace-pre-wrap text-base font-mono max-h-60 overflow-auto shadow-md">
                        {subtitle}
                    </pre>
                    <div className="flex gap-4 mt-3">
                        <Button
                            size="sm"
                            variant="outline"
                            className="transition-transform duration-150 hover:scale-110 hover:bg-blue-50 dark:hover:bg-gray-800 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] focus:shadow-[0_0_8px_2px_rgba(59,130,246,0.7)]"
                            onClick={handleCopy}
                        >
                            {copied ? "Copied!" : "Copy"}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="transition-transform duration-150 hover:scale-110 hover:bg-green-50 dark:hover:bg-gray-800 hover:shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] focus:shadow-[0_0_8px_2px_rgba(16,185,129,0.7)]"
                            onClick={onDownloadSrt}
                        >
                            Download SRT
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpandableList; 