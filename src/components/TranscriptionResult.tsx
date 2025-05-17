import React, { useState } from "react";
import { Button } from "@/components/ui/button";

type TranscriptionResultProps = {
    subtitle: string;
    error: string;
};

const TranscriptionResult: React.FC<TranscriptionResultProps> = ({ subtitle, error }) => {
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
                    <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 left-2 z-10"
                        onClick={handleCopy}
                    >
                        {copied ? "Copied!" : "Copy"}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default TranscriptionResult; 