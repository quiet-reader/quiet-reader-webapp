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
