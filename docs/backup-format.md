# Quiet Reader backup archive format

The application exports a ZIP archive named `quiet-reader-backup.zip`.

## Layout

- `manifest.json`: archive format/version, counts, checksum algorithm, and the inventory of every payload file.
- `library.json`: library index, item-to-file references, selected backup sections, and optional appearance preferences.
- `books/book-NNNNNN.json`: one JSON record per novel, including its recent reading history, gallery metadata, image notes, locks, and recent gallery/image viewing history.
- `pastes/paste-NNNNNN.json`: one JSON record per saved pasted chapter.
- `assets/NNNNNN.ext`: original binary image assets extracted from covers, chapter images, and gallery images. Gallery image metadata (including notes, locks, added/last-opened timestamps, and bounded history) remains in its owning book record.
- `checksums.sha256`: SHA-256 digests for the manifest and every payload file.
- Optional manifest metadata: content `fingerprint`, originating device/application/platform/session/installation metadata, backup history snapshot, and virtual collections (stable references only).

## Integrity and restore behavior

The manifest records each payload file's byte length and SHA-256 digest. Restore verifies all listed files and the manifest checksum list before writing any records. Book and paste records are then written together in one IndexedDB read/write transaction; a failed transaction does not partially commit those records.

Restore is additive/upserting by record ID: existing IDs are updated, while unrelated local records are retained. Older `QuietBookBackup` JSON backups (versions 2 and 3) remain importable.

The archive uses UTF-8 JSON and ordinary image formats. It does not require the original application to inspect its text records or extract its images.


## Backup provenance and duplicate identity

The content fingerprint is SHA-256 over the sorted payload file paths and their payload SHA-256 values, excluding the timestamp-bearing library index, plus the selected backup sections. It is independent of the archive filename and ZIP compression. The manifest's `origin` records device ID/name, application/version, platform, session start, and installation start. `backupHistory` and `collections` are optional metadata fields; old archives without them remain supported. The app keeps a local bounded history and can force an otherwise duplicate export only after an explicit acknowledgement.
