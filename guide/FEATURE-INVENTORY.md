# Current feature and module inventory

## Snapshot and update rule

Baseline branch: `V1-feature`  
Baseline commit: `3b7532de22922a311971a3cf8ba3b1edcaba2e4c`  
Baseline date: 12 November 2026

This inventory was checked against the branch's root README, `index.html`, `js/` directory, and current module source. It is a functional map, not a claim that every edge case has been runtime-tested. Before every feature change, inspect the current source and update this inventory in the same commit whenever a capability, owner, UI entry point, data dependency, or module changes.

## Application surfaces

- **Library:** book grid, expanded/compact views, filters, sorting, tag filtering, author-only or whole-library search, novel/chapter/text search, library management.
- **Book detail:** metadata, author, rating, tags, cover, lock/unlock, chapter list, notes, reading/editing history, gallery tab, EPUB export, novel links.
- **Reader:** chapter navigation, chapter index, chapter search, progress, reading width/text size/theme, chapter format, copy, bookmarks, selection/paragraph highlights, notes, auto-read, system TTS and Kokoro TTS.
- **Editor:** create/edit/delete chapters, image insertion, clipboard image paste, TXT import, multi-chapter import, batch chapter renaming, lock enforcement.
- **Gallery:** image import and folder import, paste, grid/compact/slideshow views, fullscreen viewer, zoom/pan, thumbnails, image notes, lock/unlock, reorder, rename/bulk rename, image history, gallery history, storage-size display.
- **History and marks:** per-book reading/editing history, universal reading history, bookmarks, highlights, search and management.
- **Translation:** provider configuration, whole-chapter translation, restore original, copy translation, image OCR and translation to English.
- **Backup and import/export:** full ZIP backup/restore, legacy JSON backup import, EPUB import/export, PDF import, TXT imports.
- **Appearance:** reader/app themes and tag colors.
- **Offline shell:** service worker shell/runtime caching; static hosting, local-first IndexedDB library.

## Feature modules currently under `js/`

| Module | Current responsibility / notes |
|---|---|
| `app.js` | Bootstrap and central UI wiring; imports most modules and attaches many event handlers, modals, screen changes and feature actions. Current central orchestration hotspot. |
| `state.js` | Shared in-memory application state and fresh book creation. |
| `db.js` | Backward-compatible facade re-exporting the persistence adapter API for existing feature modules. |\n| `infrastructure/persistence/item-repository.js` | New V2 infrastructure adapter for the existing IndexedDB database/store; preserves current record payloads and API operations. |
| `utils.js` | DOM helpers, escaping, toast/modal, IDs, data URL and download helpers. |
| `library.js` | Library refresh/render, book detail, book creation/opening, library search/filter/sort, notes and navigation. |
| `library-counts.js` | Separate library count/summary UI enhancement. |
| `reader.js` | Reader rendering/navigation, chapter search, progress, bookmarks, chapter format, auto-read and TTS controls. |
| `editor.js` | Chapter editing, saving/deleting, image insertion, TXT import and image paste entry points. |
| `image-preview.js` | Preview and confirmation before inserting/pasting image files into supported destinations. |
| `chapter-tools.js` | Batch chapter renaming with searchable in-modal chapter selection, select-all/clear, selectable chapter order, regex and preview. |
| `galleries.js` | Gallery lifecycle, image management, fullscreen viewer, image metadata/history and gallery translation entry point. |
| `history.js` | Reading/editing event recording and universal history rendering/search/clear/lock behaviour. |
| `highlights.js` | Text/paragraph highlights, selection toolbar, bookmarks and marks management. |
| `translation.js` | Translation source configuration, chapter translation and shared image-text translation providers. |
| `image-translation.js` | Browser-side OCR preparation/recognition, OCR text cleanup, translation invocation and expandable translation display below the image. |
| `kokoro.js` | Kokoro on-device TTS integration. |
| `kokoro-worker.js` | Dedicated worker for Kokoro model/runtime inference. |
| `links.js` | Novel-to-novel and chapter-to-chapter relationships and reader navigation. |
| `backup.js` | Full backup export/import, ZIP archive integrity and restore logic. |
| `epub.js` | EPUB import and export. |
| `pdf.js` | PDF text extraction/import. |
| `themes.js` | Theme application and initialization. |

### Current coupling observations

The code is already separated into modules, but the boundaries are not fully independent:

- `app.js` imports and coordinates nearly all features.
- Feature modules share and mutate `state.js`.
- Several feature modules import other feature modules directly (for example library/reader, reader/highlights/history, galleries/library, translation/reader).
- Some UI modules call persistence directly.
- `index.html` contains the current shared DOM structure; `css/main.css` contains the main styling.
- `service-worker.js` maintains an explicit shell asset list, so module moves/additions must update its cache list and cache version when needed.

These are refactoring targets, not defects to fix through a one-shot rewrite. Preserve behaviour while gradually introducing public feature APIs, application use cases, and persistence adapters.

## Current domain and data concepts

Observed or directly represented in current records/features:

- Book/library item (manual novel, EPUB, PDF, gallery)
- Chapter (title, text, images, timestamps, edit history)
- Cover and image/gallery assets (currently may be embedded data URLs)
- Tags, author, rating, notes, lock state
- Reading progress and reading session history
- Editing history/events
- Bookmarks
- Text/paragraph highlights and attached notes/colors
- Gallery metadata, per-image notes/locks/timestamps/history
- Novel and chapter relationships
- Saved pasted chapters
- Translation provider configuration/results and reader temporary translated view
- Appearance and reader preferences

Exact persisted shapes must be verified from source before any schema change. See [DATA-COMPATIBILITY.md](DATA-COMPATIBILITY.md).

## Recent feature work to preserve

Recent commits on the baseline branch include:

- **12 Nov 2026:** searchable, locked universal history; image paste previews/confirmation; follow-up fix to preserve legacy entries when initializing universal history.
- **11 Nov 2026:** OCR whitespace normalization and translation toggle fixes; expandable translation panel below gallery image; clear translation panel when viewer closes; place image translation beneath the image; improve OCR text retention and image-translation overlay.
- The baseline README also documents: Kokoro WebGPU/FP32 worker-based TTS; whole-chapter translation providers; novel/chapter linking; library-wide and per-novel search; notes/tags/rating; gallery storage/history/locks; chapter rename; image insertion and clipboard paste.

Do not drop or simplify these recent features during architecture work. Treat them as first-class regression requirements.

### V2 feature update — 12 Nov 2026\n\n- Feature/capability: Removed per-row rename checkboxes from the chapter index; chapter selection now lives in the rename dialog with title search, individual selection, select-all/clear, and forward/reverse numbering order. Novel and chapter link editing controls are disabled while the current novel is locked, with guards in the link-management entry points.\n- Owning modules: `chapter-tools.js`, `library.js`, `links.js`, and `app.js`; styles in `css/main.css`.\n- Persisted data or backup impact: None; rename operations retain the existing chapter history behaviour and do not change record structure.\n- Compatibility/migration impact: None.\n- Tests run and outcome: Static source inspection only.\n- Known limitations / not tested: Browser interaction, keyboard/screen-reader behaviour, lock/unlock regression, chapter-link mutation across paired novels, and offline cache update not runtime-tested.\n\n## Feature change log template

Append a short entry whenever a feature is added, changed, moved, or removed:

- Date and commit:
- Feature/capability:
- Owning module / public API:
- UI entry points (desktop and mobile, when applicable):
- Persisted data or backup impact:
- Compatibility/migration impact:
- Tests run and outcome:
- Known limitations / not tested:

If a feature is intentionally removed, record the explicit user-approved reason and the migration/backup impact.


### V2 architecture work — 12 Nov 2026

- Date and commit: 12 Nov 2026; see V2-feature branch history.
- Feature/capability: Introduced an infrastructure persistence adapter without changing user-facing features.
- Owning module / public API: `js/infrastructure/persistence/item-repository.js`; legacy `js/db.js` re-exports the same operations.
- UI entry points: None changed.
- Persisted data or backup impact: None intended; same IndexedDB database/store/key path and unchanged record payloads.
- Compatibility/migration impact: No migration; old imports remain supported through `db.js`.
- Tests run and outcome: Source-level inspection only; browser runtime and IndexedDB regression tests not run.
- Known limitations / not tested: Existing modules still use the legacy facade and shared state; further boundary extraction remains.

## V3 ownership and dependency baseline — 12 Nov 2026

The detailed ownership and API index is [FEATURE-OWNERSHIP.md](FEATURE-OWNERSHIP.md); the observed import graph and known cycles are in [DEPENDENCY-MAP.md](DEPENDENCY-MAP.md). These documents are the canonical detailed maps. This inventory remains the high-level capability list.

### New shared policy infrastructure

- `js/shared/policies.js`: owns book-level capability decisions. Public API: `can(book, capability)` and `BOOK_CAPABILITY_NAMES`. It has no DOM, storage, state, or feature imports. Current capabilities cover metadata/tags/cover editing, book deletion, chapter create/edit/delete/rename/reorder, gallery management, and novel/chapter link management.
- Consumers: app event handlers, library UI and delete operation, editor operations, chapter rename, link managers, and gallery book-level mutation entry points.
- It does not own image-specific locks, storage writes, toasts, or UI state.

### Current ownership snapshot

- App composition and event routing: `js/app.js`.
- Library/book records and library presentation: `js/library.js`, `js/state.js`.
- Chapter text editing/import and embedded chapter images: `js/editor.js`.
- Batch chapter rename: `js/chapter-tools.js`.
- Reader navigation/search/progress/TTS: `js/reader.js`, `js/kokoro.js`, `js/kokoro-worker.js`.
- Novel/chapter relationships: `js/links.js`.
- Bookmarks/highlights and selection UI: `js/highlights.js`.
- Reading/editing history: `js/history.js`.
- Gallery and individual gallery-image operations: `js/galleries.js`.
- Translation providers and translated chapter state: `js/translation.js`; image overlay integration: `js/image-translation.js`.
- Backup import/export: `js/backup.js`; backup format reference: `docs/backup-format.md`.
- EPUB and PDF import/export: `js/epub.js`, `js/pdf.js`.
- IndexedDB adapter: `js/infrastructure/persistence/item-repository.js`; compatibility facade: `js/db.js`.
- Theme and browser UI utilities: `js/themes.js`, `js/utils.js`.
- Shared application state and new book creation defaults: `js/state.js`.
- Cross-feature book-level authorization: `js/shared/policies.js`.

### V3 change record

- Change: introduce a central capability policy and publish the feature ownership/dependency/policy/data/change documentation set.
- Runtime files changed: app, library, editor, chapter tools, links, galleries, service worker; new shared policy module.
- Intended behaviour: preserve current lock semantics while sharing the decision function; no new user-facing workflow.
- Data/schema: none; existing book.locked field remains unchanged.
- Verification: static source inspection and targeted source replacements; no browser/runtime or regression suite run.
- Known follow-up: remaining direct lock-based presentation checks and individual gallery-image lock rules are not all routed through the book-level capability module. Shared state and cross-feature imports remain in place.

## V3 capability enforcement follow-up — 12 Nov 2026

A follow-up pass added operation-boundary checks to chapter saving and paste-image entry, note saving, reader-to-editor navigation, and gallery book-level image operations. Gallery image locks remain a separate per-image rule. The book lock is still stored only as `book.locked`; no new permission data is persisted. This is the same V3 architecture phase, not a new feature branch or data migration.
