# Feature-change and release checklist

Complete this checklist for every feature addition, bug fix, refactor, UI redesign, dependency change, or persistence change. Mark an item N/A only with a brief reason. Do not mark tests as passed unless they were actually run.

## Before coding

- [ ] Read `guide/README.md`, `ARCHITECTURE.md`, `DATA-COMPATIBILITY.md`, and `FEATURE-INVENTORY.md`.
- [ ] Inspect the current target branch and its recent commits; do not rely on an old inventory.
- [ ] Identify the owning feature, its public entry point, UI entry points, and all dependent modules.
- [ ] Trace all data read/write paths, including IndexedDB, localStorage, import/export, backup restore, and service-worker caches.
- [ ] Record existing behaviour that must remain unchanged.
- [ ] Confirm whether this is a behaviour change or an internal restructuring. Do not silently turn one into the other.
- [ ] For a UI change, define equivalent desktop and mobile capabilities before implementation.

## Architecture and implementation

- [ ] Keep dependency direction aligned with `ARCHITECTURE.md`.
- [ ] Do not introduce circular imports or cross-feature private imports.
- [ ] Keep domain rules out of DOM/presentation code.
- [ ] Keep persistence rules out of presentation components.
- [ ] Use stable IDs and explicit contracts; do not use array positions as new identities.
- [ ] Avoid unnecessary framework, backend, build-system, or dependency additions.
- [ ] Keep optional features isolated so failure does not prevent the core library/reader from starting.
- [ ] Update the service-worker shell asset list and cache version when required.
- [ ] Preserve offline/static-hosting behaviour.

## Data safety and compatibility

- [ ] Existing IndexedDB database and records are preserved.
- [ ] No database/store reset, destructive rewrite, or implicit migration is introduced.
- [ ] Existing fields not understood by the changed UI are preserved on save.
- [ ] Book/chapter/image IDs, ordering, links, bookmarks, highlights, progress, notes, locks, and histories retain their meaning.
- [ ] Any schema migration is explicit, versioned, idempotent, and has a recovery/backup plan.
- [ ] Current ZIP backup export and restore still work.
- [ ] Legacy `QuietBookBackup` JSON versions 2 and 3 remain importable unless a separately approved compatibility change says otherwise.
- [ ] Restore remains additive/upserting by record ID and does not delete unrelated local records.
- [ ] Import failure cannot leave an unreported partial or corrupted library.
- [ ] If storage/backup behaviour changed, update `guide/DATA-COMPATIBILITY.md` and `docs/backup-format.md`.

## Feature regression

Select relevant cases and run them. For architecture-wide changes, run the full set.

- [ ] App starts from a local static server.
- [ ] App works when deployed under the existing static hosting path.
- [ ] Library lists existing books and saved pasted chapters.
- [ ] Create/open/edit/lock/unlock a novel.
- [ ] Library search, author-only search, filters, tags, sorting, expanded/compact view.
- [ ] Chapter add/edit/delete, image insertion, clipboard image preview/confirmation.
- [ ] TXT single/bulk/folder import.
- [ ] EPUB import/export.
- [ ] PDF import.
- [ ] Reader chapter navigation, chapter index, progress save/restore.
- [ ] Reader whole-novel search and result navigation.
- [ ] Bookmark, highlight colors, paragraph highlight, notes, marks search/management.
- [ ] Reading history, editing history, universal history search and locked clear workflow.
- [ ] Gallery create/import/paste, grid/compact/slideshow, viewer, zoom/pan, image notes, locks, rename/reorder/history.
- [ ] Image OCR and translation, including OCR whitespace, expandable below-image result, close/reset behaviour.
- [ ] Whole-chapter translation providers, show-original, copy-translated.
- [ ] System TTS and Kokoro TTS; Kokoro worker error does not break ordinary reading.
- [ ] Novel/chapter links and navigation.
- [ ] Backup export, integrity validation, restore into a non-empty library, legacy JSON restore.
- [ ] Appearance, tag colors, reading settings.
- [ ] Offline service-worker cache and update behaviour.

## Desktop/mobile and accessibility

- [ ] Desktop presentation has all existing core capabilities.
- [ ] Mobile presentation has all existing core capabilities.
- [ ] Both use the same domain/application services and persisted data.
- [ ] No feature depends on hover alone; touch and keyboard alternatives exist.
- [ ] Controls have accessible names, focus states, and appropriate semantics.
- [ ] Dialogs/sheets can be dismissed and do not trap users unexpectedly.
- [ ] No horizontal overflow or clipped controls at supported viewport sizes.
- [ ] Text scaling, long titles, large libraries, and long chapter content remain usable.

## Performance and resilience

- [ ] No unnecessary full-library re-render or repeated expensive work was introduced.
- [ ] Large lists/searches remain responsive.
- [ ] Large images and OCR/TTS/EPUB/PDF work do not block the UI unnecessarily.
- [ ] Quota errors, missing browser APIs, provider errors, and worker failures are handled.
- [ ] Failed writes are visible and do not falsely report success.
- [ ] Cache changes do not leave users stuck on a mixed old/new module set.

## Documentation and completion

- [ ] Update `FEATURE-INVENTORY.md` and add a dated change-log entry.
- [ ] Update `ARCHITECTURE.md` if boundaries or dependency rules changed.
- [ ] Update `DATA-COMPATIBILITY.md` and backup docs if storage/import/export changed.
- [ ] Update comments/API docs for public feature contracts.
- [ ] Record exact tests/commands run and their results.
- [ ] Explicitly list anything not tested or any known regression.
- [ ] Keep commits small and reviewable.
- [ ] Do not change the stable branch, Pages source, or live deployment without separate approval.

## Completion record

- Change / feature:
- Branch and commit:
- Behaviour intended to change:
- Behaviour required to remain the same:
- Data touched (or "none"):
- Migration/backup impact:
- Tests actually run:
- Tests not run:
- Known limitations:
- Guide files updated:


## V2 initial architecture foundation record — 12 Nov 2026

- Change / feature: Add mandatory engineering guide and introduce an IndexedDB repository adapter behind the existing database facade.
- Branch and commit: `V2-feature`; see branch history (guide, adapter, facade, and service-worker cache commits).
- Behaviour intended to change: Internal persistence ownership only; no UI or feature behaviour intended to change.
- Behaviour required to remain the same: All current reading, library, editing, gallery, history, marks, translation, OCR, TTS, import/export, backup, lock, and link behaviour.
- Data touched (or "none"): No user data touched by the code change; adapter retains `quietbook-v2` / version 1 / `items` / `id` and stores passed records unchanged.
- Migration/backup impact: None; backup format and restore logic unchanged.
- Tests actually run: Static source inspection of the current database adapter, its facade, and service-worker asset list.
- Tests not run: Browser runtime, IndexedDB CRUD/transaction tests, mobile/desktop UI regression, import/export/backup round-trip, offline update, and automated test suite.
- Known limitations: Existing features still import the compatibility facade; broader feature boundary migration has not yet been performed.
- Guide files updated: README link, guide index, architecture, data compatibility, feature inventory, checklist.


## V2 feature update — 12 Nov 2026

- Change / feature: Move batch-rename chapter selection from chapter-index rows into a searchable selection list in the rename dialog; add forward/reverse numbering order; enforce editing lock on novel/chapter link management.
- Branch: `V2-feature`.
- Behaviour intended to change: Remove index-row checkboxes; add searchable individual/select-all selection and order control to rename dialog; disable link-edit controls and guard link-management entry points while locked.
- Behaviour required to remain the same: Chapter order itself is unchanged by rename direction; title changes still create chapter history entries and editing history; reading, chapter movement, export, and link navigation remain available as before.
- Data touched: Only chapter titles and existing chapter history when the user applies a rename; no schema change.
- Migration/backup impact: None.
- Tests actually run: Static source inspection and exact-source replacement checks during implementation.
- Tests not run: Browser UI, mobile/desktop, accessibility, lock/unlock interaction, paired novel/chapter link workflows, data backup/restore, and offline service-worker update.
- Known limitations: None identified by static inspection; runtime behaviour remains unverified.

## V3 documentation synchronization requirements

For every change, add a dated entry to the feature inventory and complete a change record below. Review each architecture reference and update it if affected:

- [ ] `FEATURE-OWNERSHIP.md`: owner, public API, data ownership, and consumers changed?
- [ ] `DEPENDENCY-MAP.md`: imports, dependency direction, or cycles changed?
- [ ] `SHARED-POLICIES.md`: capability, authorization rule, or enforcement point changed?
- [ ] `DATA-CONTRACT.md` and `DATA-COMPATIBILITY.md`: record fields, persistence, backup, import/export, or migration changed?
- [ ] `FAQ.md`: a new recurring architectural question or changed answer?
- [ ] `ARCHITECTURE.md` / `ARCHITECTURE-STATUS.md`: boundaries, status, or known debt changed?
- [ ] `README.md` / guide index: user-facing capability or entry-point guidance changed?

If a document is reviewed and does not need editing, state "reviewed — no change" in the completion record. The goal is synchronized truth, not needless edits.

## V3 architecture foundation record — 12 Nov 2026

- Change: create `V3-feature` from `V2-feature`; add `js/shared/policies.js` and route primary book-lock operation/UI guards through the shared capability decision; expand the engineering guide into linked ownership, dependency, policy, data, change, FAQ, and status references.
- Behaviour intended to change: no user-visible workflow intended to change. The same locked/unlocked outcomes should be produced by a shared function.
- Behaviour required to remain the same: reading, export, bookmarks, highlights, progress, history, existing chapter/link/gallery operations while unlocked, and individual image lock semantics.
- Data touched: none by the architecture code itself; `book.locked` remains the stored field.
- Migration/backup impact: none intended.
- Tests actually run: static inspection of current source and generated changes; GitHub source content checked after commit.
- Tests not run: browser runtime, interaction tests, IndexedDB CRUD, backup/restore round-trip, import/export, mobile/desktop, accessibility, offline cache update, automated suite.
- Known limitations: some presentation-only lock checks remain direct; no automated tests or runtime verification; shared state and known import cycles remain.
- Guide files updated: README, guide index, architecture, inventory, data compatibility, checklist; new ownership, dependency, shared-policy, data-contract, change-protocol, FAQ, and architecture-status pages.
