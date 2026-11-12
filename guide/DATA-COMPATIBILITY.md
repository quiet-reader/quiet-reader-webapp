# Data preservation and compatibility contract

## 1. Highest-priority invariant

**A user's library is not disposable application state.** Architecture work, responsive redesigns, module moves, visual redesigns, performance work, and future app versions must preserve existing records and keep them readable.

Do not assume that because the UI changed, the data should be recreated. A new UI must adapt to the existing data contract. A future native app, alternate frontend, or different chart/layout must be able to read the documented persisted and backup formats without depending on this browser UI's private component state.

## 2. Current observed storage contract

Observed in the V2-feature baseline:

- IndexedDB database: `quietbook-v2`
- IndexedDB version: `1`
- Object store: `items`
- Key path: `id`
- The current persistence module exposes `openDB()`, `put(item)`, `remove(id)`, `putMany(items)`, and `getAll()`.
- Book-like records include novel, EPUB, PDF, and gallery items. Records contain nested chapter and gallery data.
- Saved pasted chapters are separate records in the same object store.
- Chapter records currently contain title/text, image data, timestamps, and edit history; book records can contain cover data, notes, tags, locks, bookmarks, reading progress, reading history, gallery metadata, and novel/chapter relationships.
- Some image content is currently embedded as data URLs inside book/chapter/gallery records. Do not assume assets are already normalized into a separate object store.
- Current UI preferences also use browser localStorage. Observed keys include `qrTagColors`, `qrLibrarySort`, and `qbtheme`. Inspect the current source for all keys before changing or migrating them.

This is a code-observed baseline, not a complete schema specification. Before changing persistence, inspect every read/write path and update this document with exact record shapes and all storage keys.

## 3. Existing backup contract

The documented full backup is a ZIP archive named `quiet-reader-backup.zip` with:

- `manifest.json`: archive version, counts, checksum algorithm, payload inventory.
- `library.json`: library index, item-to-file references, selected sections, optional appearance preferences.
- `books/book-NNNNNN.json`: book records, including recent reading history, gallery metadata, image notes, locks, and bounded image/gallery history.
- `pastes/paste-NNNNNN.json`: saved pasted chapter records.
- `assets/NNNNNN.ext`: original image binaries extracted from covers, chapter images, and gallery images.
- `checksums.sha256`: SHA-256 digests for the manifest and every payload file.

Restore verifies the archive checksums before writing. Book and paste records are written together in one IndexedDB read/write transaction. Restore is additive/upserting by record ID: matching IDs are updated and unrelated local records are retained. Older `QuietBookBackup` JSON backups at versions 2 and 3 remain importable.

The full details live in [../docs/backup-format.md](../docs/backup-format.md). Update that document and this contract together whenever the archive changes.

## 4. Never do these things

- Never delete or recreate `quietbook-v2` to make a new architecture easier.
- Never clear the `items` store on startup, on version mismatch, or on UI redesign.
- Never overwrite an existing record with a newly generated default record because a field is missing.
- Never change an ID, chapter ordering, chapter index meaning, bookmark reference, history reference, relationship target, image identity, or timestamp semantics without a compatibility plan.
- Never assume that all records were created by the newest code.
- Never discard unknown fields when reading and writing older records unless a reviewed migration explicitly handles them.
- Never make a backup restore destructive to unrelated local records.
- Never require the new interface to be open in order to recover a backup.
- Never treat localStorage preferences or API credentials as interchangeable with book content; document their storage and migration separately.
- Never move image data out of records until old embedded-image records remain readable and round-trip tests pass.

## 5. Rules for any schema change

Before implementing a schema change:

1. Describe the old and new shapes with examples.
2. Identify every feature and backup/import/export path that reads or writes the affected data.
3. Define an explicit schema version and deterministic migration.
4. Ensure the migration is idempotent; a retry must not duplicate, corrupt, or discard data.
5. Preserve unknown fields where possible.
6. Validate record counts, IDs, chapter counts/order, image counts/bytes, bookmark/highlight counts, history, progress, tags, locks, links, and notes before and after.
7. Keep the original data available until validation succeeds; provide backup/recovery instructions.
8. Test old JSON backup versions and the current ZIP backup.
9. Test additive restore into a non-empty library, including duplicate IDs and unrelated records.
10. Update [../docs/backup-format.md](../docs/backup-format.md), this file, the feature inventory, and the checklist in the same change.

A migration must not run as a side effect of opening a screen or rendering a component. It must be a deliberate application-startup migration with clear version detection, safe failure handling, and a recovery path.

## 6. Compatibility boundary for future interfaces and apps

The persistence contract belongs to the application/domain layer, not to a particular UI. Any future desktop/mobile shell, alternate frontend, native wrapper, or replacement chart must:

- read the same documented records or use a documented adapter;
- preserve stable IDs and relationships;
- understand the supported schema versions;
- preserve unknown fields when round-tripping records;
- use the same import/export compatibility rules;
- never write a partial record merely because its UI does not expose every field.

A UI that does not understand a field must leave it untouched. It must not erase the field when saving another property.

## 7. Required preservation test fixture

Maintain a representative fixture containing at least:

- a manually created novel with metadata, tags, notes, lock state, multiple chapters, and chapter edit history;
- EPUB- and PDF-imported books;
- a gallery with multiple image formats, notes, locks, and viewing history;
- a chapter containing embedded images;
- bookmarks, highlights with notes/colors, reading progress, reading history, and editing history;
- novel/chapter relationships;
- saved pasted chapters;
- appearance and relevant local preferences.

For each migration and backup change, verify counts and IDs before/after and verify the restored content can be opened and edited without loss. Do not put real private user novels in public fixtures; use synthetic representative data.


## 8. V2 persistence adapter status

The implementation now routes the legacy `js/db.js` API through `js/infrastructure/persistence/item-repository.js`. This is an infrastructure-boundary change only. It retains the same IndexedDB database name, database version, object-store name, key path, CRUD semantics, and stored object payloads. It does not migrate, rewrite, re-key, normalize, or delete any user records.

Existing feature modules may continue importing from `js/db.js` during gradual migration. New application/infrastructure work should target the repository boundary and must not introduce a second database or duplicate storage format. Any later change to the actual schema requires the full migration procedure in this document.
