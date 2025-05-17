import React from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useModel } from "../hooks/useModel";
import ExpandableList from "./ExpandableList";
import ModelItem from "./ModelItem";

type ModelSelectProps = {
    models: { key: string; downloaded: boolean; downloading?: boolean }[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    disabled?: boolean;
    onDownloadModel?: (model: string) => void;
    onRemoveModel?: (model: string) => void;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    closeOtherMenu: () => void;
};

const ModelSelect: React.FC<ModelSelectProps> = ({ models, selectedModel, setSelectedModel, disabled, onDownloadModel, onRemoveModel, collapsed, setCollapsed, closeOtherMenu }) => {
    const { progressMap, setProgressMap } = useModel();
    const pollingRef = React.useRef<Record<string, ReturnType<typeof setInterval>>>({});

    React.useEffect(() => {
        // Clean up polling on unmount
        return () => {
            Object.values(pollingRef.current).forEach(clearInterval);
        };
    }, []);

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

    const headerLabel = `Model: ${selectedModel}`;
    const headerIcon = collapsed ? <FaChevronDown /> : <FaChevronUp />;

    return (
        <ExpandableList
            collapsed={collapsed}
            setCollapsed={val => {
                setCollapsed(val);
                if (!val) closeOtherMenu();
            }}
            headerLabel={headerLabel}
            headerIcon={headerIcon}
            disabled={disabled}
            className="mb-6"
        >
            <div className="flex flex-col gap-3 pr-1 mt-2">
                {!collapsed && models.map(model => {
                    const progress = progressMap[model.key]?.progress ?? 0;
                    const status = progressMap[model.key]?.status ?? (model.downloading ? "downloading" : "idle");
                    const error = progressMap[model.key]?.error;
                    return (
                        <ModelItem
                            key={model.key}
                            model={model}
                            selected={selectedModel === model.key}
                            onClick={() => {
                                if (model.downloaded && !disabled) {
                                    setSelectedModel(model.key);
                                    setCollapsed(true);
                                }
                            }}
                            disabled={disabled}
                            onDownload={() => handleDownload(model.key)}
                            onRemove={onRemoveModel ? () => onRemoveModel(model.key) : undefined}
                            progress={progress}
                            status={status}
                            error={error}
                            handleRetry={() => handleDownload(model.key)}
                        />
                    );
                })}
            </div>
        </ExpandableList>
    );
};

export default ModelSelect; 