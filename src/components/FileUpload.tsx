import React from "react";
import { FaCloudUploadAlt, FaTrash } from "react-icons/fa";
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';

type FileUploadProps = {
    filePath: string | null;
    setFilePath: (filePath: string | null) => void;
    disabled?: boolean;
};

const FileUpload: React.FC<FileUploadProps> = ({ filePath, setFilePath, disabled }) => {
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        let url: string | null = null;
        if (filePath) {
            readFile(filePath)
                .then((data: Uint8Array) => {
                    const ext = filePath.split('.').pop()?.toLowerCase();
                    let mime = '';
                    switch (ext) {
                        case 'mp4':
                            mime = 'video/mp4';
                            break;
                        case 'mov':
                            mime = 'video/quicktime';
                            break;
                        case 'avi':
                            mime = 'video/x-msvideo';
                            break;
                        case 'mp3':
                            mime = 'audio/mpeg';
                            break;
                        case 'wav':
                            mime = 'audio/wav';
                            break;
                        case 'm4a':
                            mime = 'audio/mp4';
                            break;
                        default:
                            mime = '';
                    }
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
            {!filePath ? (
                <div className="relative group w-full">
                    <button
                        type="button"
                        onClick={handlePickFile}
                        className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors bg-white/60 dark:bg-gray-900/60 group-hover:border-blue-400 ${disabled ? 'opacity-60' : 'hover:border-blue-400 cursor-pointer'}`}
                        disabled={disabled}
                    >
                        <FaCloudUploadAlt className="text-3xl text-blue-400 mb-2" />
                        <span className="text-gray-500 dark:text-gray-300 text-sm">Click to pick a file</span>
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