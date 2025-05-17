import React from "react";
import FileUpload from "@/components/FileUpload";
import ModelSelect from "@/components/ModelSelect";
import TranscriptionResult from "@/components/TranscriptionResult";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import LanguageSelect from "@/components/LanguageSelect";

type TranscribeFormProps = {
    filePath: string | null;
    setFilePath: (filePath: string | null) => void;
    models: { key: string; downloaded: boolean; downloading?: boolean }[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    uploading: boolean;
    handleUpload: () => void;
    subtitle: string;
    error: string;
    disabled?: boolean;
    onDownloadModel?: (model: string) => void;
    onRemoveModel?: (model: string) => void;
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
    languages,
    selectedLanguage,
    setSelectedLanguage,
}) => (
    <Card className="w-full max-w-md mx-auto">
        <FileUpload filePath={filePath} setFilePath={setFilePath} disabled={uploading || disabled} />
        <ModelSelect
            models={models}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            disabled={uploading || disabled}
            onDownloadModel={onDownloadModel}
            onRemoveModel={onRemoveModel}
        />
        <LanguageSelect
            languages={languages}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            disabled={uploading || disabled}
        />
        <Button
            size="lg"
            className="w-full mt-2"
            disabled={!filePath || uploading || disabled}
            onClick={handleUpload}
        >
            {uploading ? "Uploading..." : "Upload & Transcribe"}
        </Button>
        <TranscriptionResult subtitle={subtitle} error={error} />
    </Card>
);

export default TranscribeForm; 