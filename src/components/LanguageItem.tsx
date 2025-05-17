import React from "react";

type Language = {
    code: string;
    name: string;
};

type LanguageItemProps = {
    language: Language;
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
    highlight?: string;
    buttonRef?: (el: HTMLButtonElement | null) => void;
};

const LanguageItem: React.FC<LanguageItemProps> = ({ language, selected, onClick, disabled, highlight, buttonRef }) => {
    let nameContent: React.ReactNode = language.name;
    if (highlight && language.name.toLowerCase().startsWith(highlight)) {
        nameContent = (
            <>
                <span className="font-bold text-blue-600 dark:text-blue-400">{language.name.slice(0, highlight.length)}</span>
                <span>{language.name.slice(highlight.length)}</span>
            </>
        );
    }
    return (
        <button
            ref={buttonRef}
            type="button"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors bg-white/60 dark:bg-gray-900/60 shadow-sm
                ${selected ? 'border-blue-400' : 'border-gray-200 dark:border-gray-800'}
                hover:border-blue-300 cursor-pointer text-left hover:bg-blue-50 dark:hover:bg-blue-900
                focus:outline-none`}
            onClick={onClick}
            disabled={disabled}
        >
            <span className={`flex-1 cursor-pointer select-none text-base ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>{nameContent}</span>
        </button>
    );
};

export default LanguageItem; 