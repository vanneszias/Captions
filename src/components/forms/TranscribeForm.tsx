import { useState } from "react";
import FileUpload from "@/components/forms/FileUpload";
import ModelSelect from "@/components/model/ModelSelect";
import TranscriptionResult from "@/components/forms/TranscriptionResult";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import LanguageSelect from "@/components/language/LanguageSelect";
import { useSubtitles } from "@/hooks/useSubtitles";
import type { ModelInfo } from "@/hooks/useModel";
import "./glow.css";

type TranscribeFormProps = {
    filePath: string | null;
    setFilePath: (filePath: string | null) => void;
    models: ModelInfo[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    uploading: boolean;
    handleUpload: () => void;
    subtitle: string;
    error: string;
    disabled?: boolean;
    onDownloadModel?: (model: string) => void;
    onRemoveModel?: (model: string) => void;
    pauseModelDownload?: (modelKey: string) => void;
    languages: { code: string; name: string }[];
    selectedLanguage: string;
    setSelectedLanguage: (code: string) => void;
};

const TranscribeForm: React.FC<TranscribeFormProps> = ({
    filePath,
    setFilePath,
    models,
    selectedModel,
    setSelectedModel,
    uploading,
    handleUpload,
    subtitle,
    error,
    disabled,
    onDownloadModel,
    onRemoveModel,
    pauseModelDownload,
    languages,
    selectedLanguage,
    setSelectedLanguage,
}) => {
    const [openMenu, setOpenMenu] = useState<null | 'model' | 'language'>(null);
    const [filterTimestamps, setFilterTimestamps] = useState(true);

    // Extract filename from filePath for SRT naming
    const videoFilename = filePath ? filePath.split("/").pop() : undefined;

    const { displaySubtitle } = useSubtitles(subtitle, filterTimestamps, videoFilename);
    const { downloadSrt } = useSubtitles(subtitle, filterTimestamps, videoFilename);

    return (
        <Card className="w-full max-w-md mx-auto">
            <FileUpload filePath={filePath} setFilePath={setFilePath} disabled={uploading || disabled} />
            <ModelSelect
                models={models}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                disabled={uploading || disabled}
                onDownloadModel={onDownloadModel}
                onRemoveModel={onRemoveModel}
                pauseModelDownload={pauseModelDownload}
                collapsed={openMenu !== 'model'}
                setCollapsed={collapsed => setOpenMenu(collapsed ? null : 'model')}
                closeOtherMenu={() => setOpenMenu('model')}
            />
            <LanguageSelect
                languages={languages}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                disabled={uploading || disabled}
                collapsed={openMenu !== 'language'}
                setCollapsed={collapsed => setOpenMenu(collapsed ? null : 'language')}
                closeOtherMenu={() => setOpenMenu('language')}
            />
            <Button
                size="lg"
                className={`w-full mt-2 ${uploading ? "big-glow" : ""}`}
                disabled={!filePath || uploading || disabled}
                onClick={handleUpload}
            >
                {uploading ? "Generating..." : "Generate Captions"}
            </Button>
            <div className="flex items-center mt-2 mb-2">
                <input
                    id="filter-timestamps"
                    type="checkbox"
                    checked={filterTimestamps}
                    onChange={e => setFilterTimestamps(e.target.checked)}
                    className="mr-2"
                />
                <label htmlFor="filter-timestamps" className="text-sm text-gray-700 dark:text-gray-300 select-none">
                    Hide timestamps in subtitle output
                </label>
            </div>
            <TranscriptionResult subtitle={displaySubtitle} error={error} onDownloadSrt={downloadSrt} />
        </Card>
    );
};

export default TranscribeForm; 