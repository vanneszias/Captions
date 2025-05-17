import React, { useState, useRef, useEffect } from "react";

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

    useEffect(() => {
        if (listRef.current) {
            setIsAnimating(true);
            const handle = () => setIsAnimating(false);
            const node = listRef.current;
            node.addEventListener('transitionend', handle);
            return () => node.removeEventListener('transitionend', handle);
        }
    }, [collapsed]);

    const selected = languages.find(l => l.code === selectedLanguage);

    return (
        <div className="mb-4">
            <div
                className={`flex items-center justify-between mb-2 ${!collapsed ? 'cursor-pointer' : ''}`}
                onClick={() => { if (!collapsed) setCollapsed(true); }}
                style={{ minHeight: '2.5rem', userSelect: 'none' }}
            >
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Language
                </span>
            </div>
            {collapsed && selected ? (
                <button
                    type="button"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white/60 dark:bg-gray-900/60 shadow-sm border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500 w-full text-left"
                    onClick={() => setCollapsed(false)}
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
                    {languages.map(lang => (
                        <button
                            key={lang.code}
                            type="button"
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors bg-white/60 dark:bg-gray-900/60 shadow-sm ${selectedLanguage === lang.code ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500' : 'border-gray-200 dark:border-gray-800'} hover:border-blue-300 cursor-pointer`}
                            onClick={() => {
                                setSelectedLanguage(lang.code);
                                setCollapsed(true);
                            }}
                            disabled={disabled}
                        >
                            <span className={`flex-1 cursor-pointer select-none text-base ${selectedLanguage === lang.code ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>{lang.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSelect; 