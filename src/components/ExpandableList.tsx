import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExpandableListProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    headerLabel: React.ReactNode;
    headerIcon: React.ReactNode;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
    onHeaderClick?: () => void;
}

const ExpandableList: React.FC<ExpandableListProps> = ({
    collapsed,
    setCollapsed,
    headerLabel,
    headerIcon,
    disabled = false,
    children,
    className = "",
    onHeaderClick,
}) => {
    const handleHeaderClick = () => {
        if (onHeaderClick) onHeaderClick();
        setCollapsed(!collapsed);
    };

    return (
        <div className={className}>
            <button
                type="button"
                className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white/60 dark:bg-gray-900/60 shadow-sm border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500 w-full text-left mb-2"
                onClick={handleHeaderClick}
                aria-label={collapsed ? `Expand ${headerLabel}` : `Collapse ${headerLabel}`}
                disabled={disabled}
            >
                <span className="flex-1 cursor-pointer select-none text-base text-gray-800 dark:text-gray-100">
                    {headerLabel}
                </span>
                <span className="ml-2 text-blue-500">{headerIcon}</span>
            </button>
            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.div
                        key="expandable-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: "hidden" }}
                        aria-hidden={collapsed}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ExpandableList; 