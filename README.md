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
- Offline app-shell caching through a service worker.

## Run

Open `index.html` through a local static server (ES modules and IndexedDB require a browser origin), or enable GitHub Pages for the repository. No build step is required. JSZip is loaded from jsDelivr for EPUB support.

## Storage compatibility

The app deliberately keeps the existing `quietbook-v2` IndexedDB database and `items` object store. If you used the earlier QuietBook reader in the same browser profile and origin, existing records remain in place. Export a backup before making major changes or clearing browser data.

## Kokoro WebGPU experiment

This branch changes the experimental Kokoro engine from q8/WASM to WebGPU/FP32 so it can be compared against `adding-tts-feature-test`.

- Model: `dev-amarnadh-gandham/Kokoro-82M-v1.0-ONNX-webgpu`, a graph-patched equivalent of Kokoro-82M intended to correct an ONNX Runtime WebGPU ConvTranspose issue in the upstream export.
- Runtime: `kokoro-js` 1.2.1 from jsDelivr.
- Inference: WebGPU in a dedicated Web Worker; FP32 model weights.
- Voice: `af_heart` by default. The kokoro-js voice assets remain loaded from the upstream ONNX community model repository.
- No text is sent to a TTS API. Speech is generated on-device.
- WebGPU requires a supported browser, GPU adapter, hardware acceleration, and a secure origin (GitHub Pages HTTPS or localhost). This branch intentionally reports an error rather than silently falling back to WASM, so the backend being measured is unambiguous.
- First use downloads model/runtime assets and compiles GPU shaders. The first generation can therefore be slower than subsequent generations.
- The worker logs each generation's inference time, audio duration and real-time factor (RTF) in the browser console. RTF below 1.0 means audio was generated faster than it plays; lower is better.

**Important:** This is an experimental comparison branch, not a replacement for the existing WASM branch. Export a backup before testing. The upstream model graph is patched for WebGPU compatibility; audio quality should be listened to and checked before relying on it.
