export { };
import React from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import ExpandableList from "@/components/forms/ExpandableList";
import ModelItem from "./ModelItem";
import type { ModelInfo } from "@/hooks/useModel";

/**
 * Props for ModelSelect component.
 */
type ModelSelectProps = {
    models: ModelInfo[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    disabled?: boolean;
    onDownloadModel?: (model: string) => void;
    onRemoveModel?: (model: string) => void;
    pauseModelDownload?: (modelKey: string) => void;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    closeOtherMenu: () => void;
};

/**
 * Renders a selectable list of models with download/progress actions.
 */
const ModelSelect: React.FC<ModelSelectProps> = ({
    models,
    selectedModel,
    setSelectedModel,
    disabled,
    onDownloadModel,
    onRemoveModel,
    pauseModelDownload,
    collapsed,
    setCollapsed,
    closeOtherMenu,
}) => {
    const headerLabel = `Model: ${selectedModel}`;
    const headerIcon = collapsed ? <FaChevronDown /> : <FaChevronUp />;

    return (
        <ExpandableList
            collapsed={collapsed}
            setCollapsed={(val: boolean) => {
                setCollapsed(val);
                if (!val) closeOtherMenu();
            }}
            headerLabel={headerLabel}
            headerIcon={headerIcon}
            disabled={disabled}
            className="mb-6"
        >
            <div className="flex flex-col gap-3 pr-1 mt-2 relative z-10 overflow-visible">
                {models.map(model => {
                    const removing = model.status === "removing" || model.removing;
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
                            disabled={disabled || removing}
                            onDownload={onDownloadModel ? () => onDownloadModel(model.key) : undefined}
                            onRemove={onRemoveModel ? () => onRemoveModel(model.key) : undefined}
                            handleRetry={onDownloadModel ? () => onDownloadModel(model.key) : undefined}
                            onPause={pauseModelDownload ? () => pauseModelDownload(model.key) : undefined}
                        />
                    );
                })}
            </div>
        </ExpandableList>
    );
};

export default ModelSelect; 