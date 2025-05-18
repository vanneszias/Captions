import { useState, useEffect } from "react";
import TranscribeForm from "@/components/forms/TranscribeForm";
import { useTranscription } from "@/hooks/useTranscription";

// Whisper supported languages
const WHISPER_LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "ar", name: "Arabic" },
    { code: "tr", name: "Turkish" },
    { code: "pl", name: "Polish" },
    { code: "nl", name: "Dutch" },
    { code: "sv", name: "Swedish" },
    { code: "fi", name: "Finnish" },
    { code: "no", name: "Norwegian" },
    { code: "da", name: "Danish" },
    { code: "uk", name: "Ukrainian" },
    { code: "cs", name: "Czech" },
    { code: "el", name: "Greek" },
    { code: "hu", name: "Hungarian" },
    { code: "ro", name: "Romanian" },
    { code: "bg", name: "Bulgarian" },
    { code: "hi", name: "Hindi" },
    { code: "th", name: "Thai" },
    { code: "vi", name: "Vietnamese" },
    { code: "id", name: "Indonesian" },
    { code: "he", name: "Hebrew" },
    { code: "fa", name: "Persian" },
    { code: "ur", name: "Urdu" },
    { code: "ta", name: "Tamil" },
    { code: "te", name: "Telugu" },
    { code: "ml", name: "Malayalam" },
    { code: "bn", name: "Bengali" },
    { code: "pa", name: "Punjabi" },
    { code: "gu", name: "Gujarati" },
    { code: "mr", name: "Marathi" },
    { code: "kn", name: "Kannada" },
    { code: "or", name: "Odia" },
    { code: "si", name: "Sinhala" },
    { code: "my", name: "Burmese" },
    { code: "km", name: "Khmer" },
    { code: "lo", name: "Lao" },
    { code: "am", name: "Amharic" },
    { code: "sw", name: "Swahili" },
    { code: "zu", name: "Zulu" },
    { code: "xh", name: "Xhosa" },
    { code: "st", name: "Southern Sotho" },
    { code: "tn", name: "Tswana" },
    { code: "ts", name: "Tsonga" },
    { code: "ss", name: "Swati" },
    { code: "ve", name: "Venda" },
    { code: "nr", name: "South Ndebele" },
    { code: "af", name: "Afrikaans" },
    { code: "yo", name: "Yoruba" },
    { code: "ig", name: "Igbo" },
    { code: "ha", name: "Hausa" },
    { code: "so", name: "Somali" },
    { code: "om", name: "Oromo" },
    { code: "ti", name: "Tigrinya" },
    { code: "rw", name: "Kinyarwanda" },
    { code: "ln", name: "Lingala" },
    { code: "kg", name: "Kongo" },
    { code: "fr-CA", name: "French (Canada)" },
    { code: "es-MX", name: "Spanish (Mexico)" },
    // Add more as needed
];

const HomePage = () => {
    const {
        filePath,
        setFilePath,
        models,
        selectedModel,
        setSelectedModel,
        uploading,
        handleUpload,
        subtitle,
        error,
        onDownloadModel,
        onRemoveModel,
        language,
        setLanguage,
        pauseModelDownload,
    } = useTranscription();

    // Dark mode toggle state
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            setIsDark(e.matches);
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };
        mq.addEventListener('change', handler);
        // Set initial class
        if (mq.matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        setIsDark(mq.matches);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const handleToggleDark = () => {
        setIsDark((prev) => {
            const newIsDark = !prev;
            if (newIsDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return newIsDark;
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors relative">
            <div className="app-drag w-full h-10 absolute top-0 left-0 z-40" />
            <header className="w-full py-8 flex flex-col items-center justify-center mb-4 relative z-50">
                <button
                    onClick={handleToggleDark}
                    className="absolute top-4 right-4 bg-white/80 dark:bg-gray-800/80 rounded-full p-2 m-4 shadow hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Toggle dark mode"
                >
                    {isDark ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>
                    )}
                </button>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white drop-shadow-sm mb-2">Captions</h1>
                <p className="text-lg text-gray-500 dark:text-gray-300 max-w-xl text-center">🎬 An app to create beautiful, accurate subtitles from your audio and video files. ✨ All locally, on device with the magic of a Whisper 🪄</p>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center">
                <TranscribeForm
                    filePath={filePath}
                    setFilePath={setFilePath}
                    models={models}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    uploading={uploading}
                    handleUpload={handleUpload}
                    subtitle={subtitle}
                    error={error}
                    onDownloadModel={onDownloadModel}
                    onRemoveModel={onRemoveModel}
                    pauseModelDownload={pauseModelDownload}
                    languages={WHISPER_LANGUAGES}
                    selectedLanguage={language}
                    setSelectedLanguage={setLanguage}
                />
            </main>
            <footer className="w-full py-6 flex flex-col items-center border-t border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md mt-8">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Made with ❤️ by Zias
                </p>
            </footer>
        </div>
    );
};

export default HomePage; 