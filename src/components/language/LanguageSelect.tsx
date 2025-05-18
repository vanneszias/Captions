import React, { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import ExpandableList from "@/components/forms/ExpandableList";
import LanguageItem from "./LanguageItem";

type Language = {
    code: string;
    name: string;
};

type LanguageSelectProps = {
    languages: Language[];
    selectedLanguage: string;
    setSelectedLanguage: (code: string) => void;
    disabled?: boolean;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    closeOtherMenu: () => void;
};

const LanguageSelect: React.FC<LanguageSelectProps> = ({
    languages,
    selectedLanguage,
    setSelectedLanguage,
    disabled,
    collapsed,
    setCollapsed,
    closeOtherMenu,
}) => {
    const [searchBuffer, setSearchBuffer] = useState("");
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [scrollToIdx, setScrollToIdx] = useState<number | null>(null);

    useEffect(() => {
        if (!collapsed) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                    const nextBuffer = searchBuffer + e.key.toLowerCase();
                    setSearchBuffer(nextBuffer);
                    if (searchTimeout.current) clearTimeout(searchTimeout.current);
                    searchTimeout.current = setTimeout(() => setSearchBuffer(""), 500);
                    // Find first match
                    const idx = languages.findIndex(lang => lang.name.toLowerCase().startsWith(nextBuffer));
                    if (idx !== -1) {
                        setScrollToIdx(idx);
                        buttonRefs.current[idx]?.focus();
                    }
                } else if (e.key === 'Backspace' && searchBuffer.length > 0) {
                    const nextBuffer = searchBuffer.slice(0, -1);
                    setSearchBuffer(nextBuffer);
                    if (searchTimeout.current) clearTimeout(searchTimeout.current);
                    if (nextBuffer) {
                        searchTimeout.current = setTimeout(() => setSearchBuffer(""), 500);
                        // Find first match
                        const idx = languages.findIndex(lang => lang.name.toLowerCase().startsWith(nextBuffer));
                        if (idx !== -1) {
                            setScrollToIdx(idx);
                            buttonRefs.current[idx]?.focus();
                        }
                    }
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                if (searchTimeout.current) clearTimeout(searchTimeout.current);
            };
        }
    }, [collapsed, searchBuffer, languages]);

    useEffect(() => {
        if (scrollToIdx !== null && buttonRefs.current[scrollToIdx]) {
            buttonRefs.current[scrollToIdx]?.scrollIntoView({ block: 'nearest' });
            setScrollToIdx(null);
        }
    }, [scrollToIdx]);

    const selected = languages.find(l => l.code === selectedLanguage);
    const headerLabel = `Language: ${selected ? selected.name : ''}`;
    const headerIcon = collapsed ? <FaChevronDown /> : <FaChevronUp />;

    return (
        <ExpandableList
            collapsed={collapsed}
            setCollapsed={val => {
                setCollapsed(val);
                if (!val) closeOtherMenu();
                setSearchBuffer("");
            }}
            headerLabel={headerLabel}
            headerIcon={headerIcon}
            disabled={disabled}
            className="mt-4 mb-4"
        >
            <div
                className="flex flex-col gap-3 pr-1 custom-scrollbar mt-2 relative z-10 overflow-visible"
                style={{
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    maxHeight: 200,
                }}
                aria-hidden={collapsed}
            >
                {!collapsed && languages.map((lang, idx) => (
                    <LanguageItem
                        key={lang.code}
                        language={lang}
                        selected={selectedLanguage === lang.code}
                        onClick={() => {
                            setSelectedLanguage(lang.code);
                            setCollapsed(true);
                            setSearchBuffer("");
                        }}
                        disabled={disabled}
                        highlight={searchBuffer}
                        buttonRef={el => buttonRefs.current[idx] = el}
                    />
                ))}
            </div>
        </ExpandableList>
    );
};

export default LanguageSelect;