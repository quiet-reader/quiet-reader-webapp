# Quiet Dash Reader

A local-first web reader for personal novels and EPUBs. It runs as a static website; book content, reading progress, bookmarks and highlights are stored in the browser's IndexedDB.

## Features

- Personal library: create novels, edit chapters, lock editing, and add cover images.
- EPUB import and export.
- Reader controls: chapter navigation, saved progress, theme, text size and reading width.
- Persistent text highlights with notes, plus chapter bookmarks and a highlights manager.
- Insert images into chapters at the cursor.
- Export and restore a complete local backup.
- Paste a chapter directly into a new book or save it for later.
- Visual auto-read with synchronized paragraph highlighting and speech.
- Optional Kokoro local TTS: the browser downloads the quantized model on first use, then Transformers.js caches model/WASM files in browser storage for later offline use.
- Offline app-shell caching through a service worker.

## Run

Open `index.html` through a local static server (ES modules and IndexedDB require a browser origin), or enable GitHub Pages for the repository. No build step is required. JSZip is loaded from jsDelivr for EPUB support.

## Storage compatibility

The app deliberately keeps the existing `quietbook-v2` IndexedDB database and `items` object store. If you used the earlier QuietBook reader in the same browser profile and origin, existing records remain in place. Export a backup before making major changes or clearing browser data.

## Project layout

- `index.html` — application shell
- `css/main.css` — layout, themes and responsive styling
- `js/app.js` — event wiring and startup
- `js/db.js` — IndexedDB access
- `js/library.js` — library and book management
- `js/reader.js` — chapter rendering, navigation and progress
- `js/editor.js` — chapter editing and image insertion
- `js/highlights.js` — highlights, notes and bookmarks
- `js/epub.js` — EPUB import/export
- `js/backup.js` — local backup and restore
- `js/themes.js` — appearance preferences
- `js/state.js` — shared application state
- `js/utils.js` — shared helpers

Optional Gotham Pro font files can be placed in `fonts/` using the filenames referenced by the stylesheet. Without them, the reader falls back to the system sans-serif font.

## Kokoro offline TTS

In the reader toolbar, set **Engine → Kokoro (offline)** and start Auto-read. The first run requires an internet connection to download the Kokoro JavaScript runtime and the quantized ONNX model (roughly 90–95 MB, plus tokenizer/voice/runtime assets). Model files are cached by Transformers.js in the browser Cache API; the app shell and runtime modules are cached by the service worker. Later reading can work offline after the first load has completed.

- Default model: `onnx-community/Kokoro-82M-v1.0-ONNX`
- Runtime: `kokoro-js` 1.2.1, loaded as browser ESM from jsDelivr
- Inference: WASM with 8-bit quantization (`q8`) for a smaller download and broad browser compatibility.
- Default voice: `af_heart`; several English voices are selectable.
- No text is sent to a TTS API. Speech is generated on the device.
- Use a secure origin (GitHub Pages HTTPS or localhost). Browser storage may still be cleared or evicted by the browser; offline availability is not permanent if that happens.
- The first model load can take a while and uses memory. Close other heavy tabs if the browser runs out of memory.

The existing **System** engine remains available as a fallback. Kokoro is lazy-loaded only when selected and Auto-read is started.
