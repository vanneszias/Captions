import React from "react";
import { FaCloudUploadAlt, FaTrash } from "react-icons/fa";
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from "@tauri-apps/api/webview";

type FileUploadProps = {
    filePath: string | null;
    setFilePath: (filePath: string | null) => void;
    disabled?: boolean;
};

const FileUpload: React.FC<FileUploadProps> = ({ filePath, setFilePath, disabled }) => {
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [warning, setWarning] = React.useState<string | null>(null);

    // Supported extensions
    const supportedExtensions = ['mp4', 'mov', 'avi', 'mp3', 'wav', 'm4a'];
    const mimeMap: Record<string, string> = {
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
    };

    React.useEffect(() => {
        let url: string | null = null;
        if (filePath) {
            readFile(filePath)
                .then((data: Uint8Array) => {
                    const ext = filePath.split('.').pop()?.toLowerCase();
                    const mime = ext && supportedExtensions.includes(ext) ? mimeMap[ext] : '';
                    const blob = new Blob([data], { type: mime });
                    url = URL.createObjectURL(blob);
                    setPreviewUrl(url);
                })
                .catch(() => setPreviewUrl(null));
        } else {
            setPreviewUrl(null);
        }
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [filePath]);

    // Listen for Tauri drag-and-drop events for file paths
    React.useEffect(() => {
        let unlisten: (() => void) | undefined;
        getCurrentWebview().onDragDropEvent((event) => {
            if (event.payload.type === 'drop') {
                const paths = event.payload.paths;
                if (paths && paths.length > 0) {
                    const ext = paths[0].split('.').pop()?.toLowerCase();
                    if (ext && supportedExtensions.includes(ext)) {
                        setFilePath(paths[0]);
                    } else {
                        setWarning('Unsupported file type. Please select a supported audio or video file.');
                        setTimeout(() => setWarning(null), 4000);
                    }
                }
            }
        }).then((fn) => {
            unlisten = fn;
        });
        return () => {
            if (unlisten) unlisten();
        };
    }, [setFilePath, disabled]);

    const handlePickFile = async () => {
        const result = await openDialog({
            multiple: false,
            filters: [
                { name: 'Media', extensions: ['mov', 'mp4', 'avi', 'wav', 'mp3', 'm4a'] }
            ]
        });
        if (typeof result === 'string') {
            setFilePath(result);
        }
    };
    return (
        <div className="mb-6 w-full">
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                Select Audio or Video File
            </label>
            {warning && (
                <div className="mb-2 text-xs text-red-600 dark:text-red-400 font-medium animate-pulse">
                    {warning}
                </div>
            )}
            {!filePath ? (
                <div className="relative group w-full">
                    <button
                        type="button"
                        onClick={handlePickFile}
                        className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors bg-white/60 dark:bg-gray-900/60 group-hover:border-blue-400 ${disabled ? 'opacity-60' : 'hover:border-blue-400 cursor-pointer'}`}
                        disabled={disabled}
                    >
                        <FaCloudUploadAlt className="text-3xl text-blue-400 mb-2" />
                        <span className="text-gray-500 dark:text-gray-300 text-sm">Click or drop a file here</span>
                    </button>
                </div>
            ) : (
                <div className="relative mt-3 flex flex-col gap-2 items-start w-full">
                    {previewUrl && filePath.match(/\.(mp4|mov|avi)$/i) && (
                        <video src={previewUrl} controls className="rounded w-full max-h-40 mt-1" />
                    )}
                    {previewUrl && filePath.match(/\.(mp3|wav|m4a)$/i) && (
                        <audio src={previewUrl} controls className="w-full mt-1" />
                    )}
                    <div className="flex flex-row justify-between items-center gap-2 w-full">
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
                            Selected: <span className="font-medium">{filePath.split('/').pop()}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setFilePath(null)}
                            className="relative bg-white/80 dark:bg-gray-900/80 rounded-full p-2 shadow hover:bg-red-100 dark:hover:bg-red-900 transition-colors flex-shrink-0"
                            aria-label="Remove file"
                        >
                            <FaTrash className="text-red-500 text-lg" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload; 