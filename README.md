# Quiet Reader

Quiet Reader is a local-first web reader for personal novels and EPUB books. It runs as a static website; books, notes, reading progress, bookmarks and highlights are stored in the browser's IndexedDB.

## Features

### Library and novel management
- Create personal novels, edit chapter titles and text, add cover images, and optionally lock editing.
- Import EPUB, PDF and TXT files; import a folder of TXT files as ordered chapters.
- Export novels as EPUB and export or restore a complete local JSON backup.
- Keep separate notes for each novel, including source links, summaries, character details and reading notes.
- Organize novels with tags and filter the library by source or tag.

### Reading experience
- Reader toolbar keeps chapter bookmarking and visual auto-read start, pause and stop controls close at hand.
- Reading settings contain scroll pacing, text-to-speech, speech speed, speech engine and voice selection.
- Choose system text-to-speech or the experimental Kokoro WebGPU engine.
- Adjust reader theme, text size and reading width; jump directly to any chapter.
- Search across every chapter title and paragraph in the open novel. Results identify title or text matches, show snippets and jump to the matching chapter and passage.
- Save text highlights in multiple colors, attach notes, and manage highlights and bookmarks.
- Insert images into chapters and switch supported chapter layouts between normal and section views.
- Reading progress is saved locally.

### Kokoro text-to-speech (WebGPU)
- Uses kokoro-js 1.2.1 and the `dev-amarnadh-gandham/Kokoro-82M-v1.0-ONNX-webgpu` model.
- Runs FP32 inference through ONNX Runtime WebGPU in a dedicated Web Worker.
- The model is a graph-patched Kokoro-82M ONNX export intended to work around an ONNX Runtime WebGPU ConvTranspose compatibility issue.
- Paragraphs are split into sentences. The reader synthesizes ahead into a rolling queue (up to 10 sentences) while ready audio is played. Paragraph highlighting stays synchronized with the active sentence.
- This is sentence-level incremental playback, not token-by-token audio streaming: an individual sentence must finish synthesis before it can play.
- Scroll pacing and speech rate are independent. The scroll slider controls visual reading pace; the Speech speed selector controls speech generation.
- Kokoro generates speech on-device after the required model and runtime assets have been downloaded. Novel text is not sent to a remote TTS API.
- The default Kokoro voice is `af_heart`; the reader also exposes the available Kokoro voice selector.
- Worker diagnostics report inference time, audio duration and real-time factor (RTF) in the browser console. RTF below 1.0 means audio was generated faster than its playback duration.

**WebGPU requirements and first run:** Use a supported browser with hardware acceleration and a working WebGPU GPU adapter. Serve the app from HTTPS (for example, GitHub Pages) or localhost; opening the HTML file directly is not supported for the module-based app. The first run downloads model/runtime assets and may compile GPU shaders, so initial setup and generation can take longer. This experimental branch intentionally does not silently fall back to WASM; if WebGPU is unavailable, it reports an error so the selected backend remains clear.

## Run

Open the repository through a local static server, or enable GitHub Pages. No build step is required. JSZip and PDF.js are loaded from CDNs for EPUB and PDF support; Kokoro runtime/model assets are also fetched when the Kokoro engine is used.

## Local storage and compatibility

The app uses the `quietbook-v2` IndexedDB database and its `items` object store. Existing records from the earlier reader remain in the same browser profile and origin. The app does not require an account or application server for its library. Browser storage is not a substitute for a backup: export a backup before clearing site data, changing browser profiles or testing experimental builds.

## Branch note

`kokoro-webgpu-test` is an experimental comparison branch for the WebGPU/FP32 Kokoro engine. It also contains the current reader, library, novel-wide search, per-novel notes and interface improvements. It is separate from the original upstream repository and should not be treated as a replacement for a stable WASM build without testing the target browser and hardware.
