import React, { useState, useRef, useEffect } from "react";
import { FaChevronUp } from "react-icons/fa";

type Language = {
    code: string;
    name: string;
};

type LanguageSelectProps = {
    languages: Language[];
    selectedLanguage: string;
    setSelectedLanguage: (code: string) => void;
    disabled?: boolean;
};

const LanguageSelect: React.FC<LanguageSelectProps> = ({
    languages,
    selectedLanguage,
    setSelectedLanguage,
    disabled,
}) => {
    const [collapsed, setCollapsed] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const [searchBuffer, setSearchBuffer] = useState("");
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [scrollToIdx, setScrollToIdx] = useState<number | null>(null);

    useEffect(() => {
        if (listRef.current) {
            setIsAnimating(true);
            const handle = () => setIsAnimating(false);
            const node = listRef.current;
            node.addEventListener('transitionend', handle);
            return () => node.removeEventListener('transitionend', handle);
        }
    }, [collapsed]);

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

    // Scroll after animation completes
    useEffect(() => {
        if (!isAnimating && scrollToIdx !== null && buttonRefs.current[scrollToIdx]) {
            buttonRefs.current[scrollToIdx]?.scrollIntoView({ block: 'nearest' });
            setScrollToIdx(null);
        }
    }, [isAnimating, scrollToIdx]);

    const selected = languages.find(l => l.code === selectedLanguage);

    return (
        <div className="mb-4">
            <div
                className={`flex items-center justify-between mb-2 ${!collapsed ? 'cursor-pointer' : ''}`}
                onClick={() => { if (!collapsed) { setCollapsed(true); setSearchBuffer(""); } }}
                style={{ minHeight: '2.5rem', userSelect: 'none' }}
            >
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Language
                </span>
                {!collapsed && (
                    <span className="p-1 text-blue-500 hover:text-blue-700">
                        <FaChevronUp />
                    </span>
                )}
            </div>
            {collapsed && selected ? (
                <button
                    type="button"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white/60 dark:bg-gray-900/60 shadow-sm border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500 w-full text-left"
                    onClick={() => { setCollapsed(false); setSearchBuffer(""); }}
                    aria-label="Expand language list"
                    disabled={disabled}
                >
                    <span className="flex-1 cursor-pointer select-none text-base text-gray-800 dark:text-gray-100">{selected.name}</span>
                    <span className="ml-2 text-blue-500">▼</span>
                </button>
            ) : (
                <div
                    ref={listRef}
                    className={`flex flex-col gap-3 pr-1 transition-all duration-300 ease-in-out ${collapsed || isAnimating ? 'overflow-hidden' : 'overflow-auto'}`}
                    style={{ maxHeight: collapsed ? 0 : 384 }}
                >
                    {languages.map((lang, idx) => {
                        // Highlight logic
                        let nameContent: React.ReactNode = lang.name;
                        if (searchBuffer && lang.name.toLowerCase().startsWith(searchBuffer)) {
                            nameContent = (
                                <>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{lang.name.slice(0, searchBuffer.length)}</span>
                                    <span>{lang.name.slice(searchBuffer.length)}</span>
                                </>
                            );
                        }
                        return (
                            <button
                                key={lang.code}
                                ref={el => buttonRefs.current[idx] = el}
                                type="button"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors bg-white/60 dark:bg-gray-900/60 shadow-sm ${selectedLanguage === lang.code ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500' : 'border-gray-200 dark:border-gray-800'} hover:border-blue-300 cursor-pointer`}
                                onClick={() => {
                                    setSelectedLanguage(lang.code);
                                    setCollapsed(true);
                                    setSearchBuffer("");
                                }}
                                disabled={disabled}
                            >
                                <span className={`flex-1 cursor-pointer select-none text-base ${selectedLanguage === lang.code ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>{nameContent}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LanguageSelect; 