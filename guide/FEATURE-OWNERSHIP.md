# Feature ownership map

This page answers: **where should a change live, who owns the behaviour/data, and what may other features call?** It records the current implementation, not an idealized future layout.

## Rules

1. One feature owns each domain operation and the data it changes.
2. Other features call the owner's public function; they do not edit its DOM or reach into private implementation details.
3. `app.js` wires events and composes features. It should not become a second owner of feature rules.
4. Shared modules contain genuinely cross-feature contracts or policies, not miscellaneous convenience functions.
5. Keep public APIs small. Add a new exported operation only when another feature needs it.
6. Data ownership follows the stable record contract, not whichever screen currently renders it.

## Ownership register

| Feature / concern | Owner | Owns or changes | Current public entry points / consumers |
|---|---|---|---|
| App composition | `js/app.js` | DOM event wiring, startup, cross-feature orchestration | Calls feature APIs; should not own domain rules |
| Shared state and book factory | `js/state.js` | Current in-memory session state; new book defaults | Imported by most feature modules; global mutable state is legacy debt |
| Library and book management | `js/library.js` | Load/list/filter/sort/open books, book details, library and chapter-index presentation | `refresh`, `drawLibrary`, `drawBook`, `openBook`, `createNovel`, `handleLibraryClick`, tab/search/view helpers; called by app, editor, chapter tools, importers |
| Chapter editing/import | `js/editor.js` | Chapter title/text, embedded chapter images, TXT import and editor lifecycle | `editChapter`, `saveChapter`, `deleteChapter`, `insertImage`, import helpers; called by app |
| Batch chapter rename | `js/chapter-tools.js` | Bulk rename selection/preview/application and chapter edit-history entry | `renameChapters`; called by app |
| Reader | `js/reader.js` | Reading render/navigation/search/progress/bookmarks? Bookmark mutation is here; highlights remain separately owned | Reader API called by app, library, links, highlights, translation |
| Bookmarks/highlights | `js/highlights.js` | Highlight and bookmark records/selection tools/marks presentation | Highlight and bookmark operations; reader calls rendering; app calls actions |
| History | `js/history.js` | Reading and editing history records and history views | `addEditEvent`, `recordReading`, history render/search; many features call it |
| Novel/chapter links | `js/links.js` | Relationship records, link editing, linked-reader navigation | `manageNovelLinks`, `manageChapterLinks`, `renderReaderLinks`, `openLinkedChapter`; app and library call |
| Galleries | `js/galleries.js` | Gallery collection/image data, image-level locks, gallery UI and operations | Gallery create/import/render/view/edit operations; app calls; image translation is delegated |
| Translation providers | `js/translation.js` | Provider configuration and translation execution/temporary translated chapter | Translation UI and functions; image translation calls provider helpers |
| Image translation overlay | `js/image-translation.js` | Overlay lifecycle and image-specific translation presentation | Gallery calls overlay functions; delegates provider work to translation |
| Backup | `js/backup.js` | Full-library backup export/import and restore validation | `exportBackup`, `importBackup`; app calls |
| EPUB | `js/epub.js` | EPUB import/export | `importEPUB`, `exportEPUB`; app calls |
| PDF | `js/pdf.js` | PDF import | `importPDF`; app calls |
| Persistence facade | `js/db.js` | Backward-compatible persistence API | Existing feature modules call `getAll`, `put`, `remove`, `putMany` |
| IndexedDB infrastructure | `js/infrastructure/persistence/item-repository.js` | Database open and low-level item CRUD | Called through `db.js`; must not own feature rules |
| Shared book capabilities | `js/shared/policies.js` | Book-level authorization decisions | `can(book, capability)`; feature operations and UI call |
| Kokoro TTS | `js/kokoro.js`, `js/kokoro-worker.js` | TTS model/session orchestration and worker inference | Reader calls TTS facade; worker should remain isolated from DOM |
| Themes | `js/themes.js` | Theme palette application and persisted theme preference | App and backup restoration call |
| Browser/UI utilities | `js/utils.js` | DOM lookup, escaping, toast/modal, file/data helpers | Broadly used; avoid adding domain-specific behaviour |
| Library counts | `js/library-counts.js` | Aggregate counts derived from persisted records | Reads via persistence facade |

## Data ownership boundaries

- A book record is owned by the library/domain. Features may update only their owned fields and must preserve fields they do not understand.
- Chapters and their embedded images are changed by chapter editing/import operations; chapter order/rename operations must preserve references from bookmarks, progress, history, and links.
- Link relationships are owned by the links feature, even though stored on book/chapter records.
- Bookmark/highlight records are owned by reader/marks behaviour; history entries by history.
- Gallery image metadata, per-image lock, and viewing history are owned by galleries.
- Backup owns the serialized transfer representation, not the meaning of every domain field.
- Persistence owns database mechanics only. It must not interpret book, chapter, link, or gallery semantics.

## Public API discipline

The exports above are the current practical entry points, not a promise that every export is a polished stable API. When extracting a feature:
- create an explicit `index.js` only when it gives other features a clear stable facade;
- export operations, not internal DOM helpers or mutable module variables;
- document arguments, returned values, persistence side effects, and errors;
- do not re-export the entire module indiscriminately;
- migrate consumers gradually and keep compatibility wrappers until all call sites are updated.

## Known ownership ambiguity

- `reader.js` currently owns progress and bookmark mutation, while `highlights.js` owns highlight and selection-related bookmark actions. Consolidate only after defining a single bookmark owner and migrating call sites without changing stored records.
- `library.js` contains book UI and orchestration helpers used by other features. Gradually separate domain operations from DOM rendering.
- `state.js` is shared mutable state rather than a set of feature-owned stores. Treat it as transitional infrastructure, not the desired final ownership model.
