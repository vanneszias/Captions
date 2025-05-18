# Captions

🎬 **Captions** is a beautiful, privacy-first desktop app to create accurate subtitles from your audio and video files. Everything runs locally on your device, powered by [Whisper](https://github.com/openai/whisper) and [FFmpeg](https://ffmpeg.org/), with a modern UI built using React, Tauri, and TypeScript.

> 🚀 **Just want to use the app?** Check the [Releases](https://github.com/yourusername/yourrepo/releases) section to download the latest version and skip the setup!

---

## 🖼️ Screenshots

* 📸 Coming soon - stay tuned! *

---

## ✨ Features

- 📝 **Automatic subtitle generation** from audio and video files
- 🔒 **Runs 100% locally** — your files never leave your device
- 🌍 **Supports dozens of languages** (via Whisper)
- 💡 **Modern, responsive UI** with light/dark mode
- 🚫 **No internet required** after initial setup

---

## ✅ Included Now

- 📝 Automatic subtitle generation from audio and video files (mp4, mov, avi, mp3, wav, m4a)
- 🔒 Runs 100% locally — your files never leave your device
- 🌍 Supports dozens of languages (via Whisper)
- 💡 Modern, responsive UI with light/dark mode
- 🚫 No internet required after initial setup
- 🖱️ Drag-and-drop or file picker for media files
- 📦 Model management: download, pause, resume, remove Whisper models
- 🌐 Language selection for transcription
- ⬇️ Download SRT subtitles after generation
- 🍏 macOS support (other platforms may work but are not officially supported yet)

---

## 🚧 Planned / Coming Soon

- 🪟 Windows and Linux support (currently macOS-focused)
- 🎬 Built-in media player for previewing subtitles in-app
- 📝 Subtitle format options (e.g., VTT, plain text)
- 📁 Batch processing (multiple files at once)
- 🎨 Customizable subtitle styles and export options
- ⏱️ More advanced timestamp filtering and editing
- 🔄 Automatic updates
- ⚠️ Better error handling and progress feedback
- 🆘 In-app help and onboarding
- 🧑‍🦽 More UI polish and accessibility improvements

---

## 🚀 Getting Started

### ⚙️ Prerequisites

- 🟢 [Node.js](https://nodejs.org/) (v18+ recommended)
- 📦 [pnpm](https://pnpm.io/) (or use npm/yarn, but pnpm is recommended)
- 🦀 [Rust](https://www.rust-lang.org/tools/install) (for Tauri backend)
- 🛠️ [Tauri CLI](https://tauri.app/v2/guides/getting-started/prerequisites/) (`cargo install tauri-cli`)
- 🍏 macOS (other platforms may work but are not officially supported as of now)

### 1️⃣ Install dependencies

```bash
pnpm install
```

### 2️⃣ Build Whisper and FFmpeg binaries

These are required for local transcription. The scripts will download and build them for you:

```bash
pnpm run predev
```
or, manually:
```bash
./scripts/build-whisper.sh
./scripts/build-ffmpeg.sh
```

### 3️⃣ Run the app in development

```bash
pnpm tauri dev
```

This will start both the frontend (Vite + React) and the Tauri backend.

### 4️⃣ Build for production

```bash
pnpm tauri build
```

---

## 🗂️ Project Structure

- `src/` — React frontend (TypeScript, TailwindCSS)
- `src-tauri/` — Tauri backend (Rust)
- `scripts/` — Helper scripts to build Whisper and FFmpeg
- `public/` — Static assets

---

## ⚡ How it works

- 🤖 **Whisper** is used for speech-to-text transcription, supporting many languages.
- 🎵 **FFmpeg** is used to convert audio/video to the format Whisper expects.
- 🖥️ The app bundles both binaries and runs them locally for privacy and speed.

---

## 🤝 Contributing

PRs and issues are welcome! Please open an issue if you have questions or suggestions.

---

## 📄 License

[MIT](LICENSE)
