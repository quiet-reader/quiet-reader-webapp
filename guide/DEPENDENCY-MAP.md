# Dependency map

This page records the **observed source-module imports on V3's baseline**. It is a navigation aid for change impact analysis. It is not a claim that the graph is already clean or mechanically enforced.

## Runtime entry and direction

```text
index.html
  └─ js/app.js  (composition root)
       ├─ feature modules
       ├─ shared state / utilities / policies
       └─ persistence facade (js/db.js)
              └─ infrastructure/persistence/item-repository.js
```

Preferred direction for new code:

```text
app / presentation
       ↓
feature operations
       ↓
shared domain contracts and policies
       ↓
infrastructure adapters
```

Features may call another feature's documented public operation when the workflow genuinely spans domains. Avoid importing its private rendering helpers or depending on its internal module state.

## Observed import adjacency list

| Module | Imports |
|---|---|
| `app.js` | utils, state, library, editor, reader, highlights, themes, backup, EPUB, PDF, db, links, translation, chapter-tools, history, galleries, image-preview, shared policies |
| `library.js` | state, db, utils, reader, history, shared policies |
| `editor.js` | state, db, utils, library, history, image-preview, shared policies |
| `chapter-tools.js` | state, db, utils, library, history, shared policies |
| `reader.js` | state, db, utils, highlights, history, Kokoro |
| `highlights.js` | state, db, utils, reader |
| `history.js` | db, state, utils |
| `links.js` | state, db, utils, reader, shared policies |
| `galleries.js` | state, db, utils, library, history, image-preview, image-translation, shared policies |
| `translation.js` | utils, state, reader, highlights |
| `image-translation.js` | utils, translation |
| `backup.js` | db, themes, utils |
| `epub.js` | state, db, library, utils |
| `pdf.js` | state, db, library, utils |
| `library-counts.js` | db |
| `themes.js` | utils |
| `state.js` | utils |
| `db.js` | infrastructure/persistence/item-repository |
| `infrastructure/persistence/item-repository.js` | browser IndexedDB APIs; no feature imports |
| `shared/policies.js` | no imports; pure book-capability decisions |
| `utils.js` | browser/DOM primitives; no feature imports |
| `kokoro.js` / worker | reader-facing TTS adapter and worker/runtime dependencies |

## Known cycles and high-coupling edges

### Confirmed circular import

- `reader.js → highlights.js → reader.js`: reader imports highlight rendering; highlights imports reader navigation. This is a real ES-module cycle and should be removed only through a small interface extraction (for example, a callback or reader navigation port), with the initialization order checked.

### High-coupling feature edges

- `library.js → reader.js`: opening/continuing a book invokes reader operations.
- `editor.js → library.js` and `chapter-tools.js → library.js`: features call library redraw/refresh functions, coupling domain operations to presentation.
- `galleries.js → library.js`: gallery actions refresh or redraw library presentation.
- `translation.js → reader.js` and `highlights.js`: translation presentation uses reader markup/highlight rendering.
- `links.js → reader.js`: linked navigation opens the reader.
- `image-translation.js → translation.js`: overlay delegates provider execution.

These are not automatically bugs. They are change-impact edges. New code should prefer a narrow operation interface or injected callback over adding more private imports.

## Dependency rules for new changes

- Infrastructure must not import features, app, or UI.
- Shared policy modules must not import DOM, app state, persistence, or features.
- Feature modules must not import `app.js`.
- `app.js` may import feature APIs; features should not call back into the composition root.
- Avoid new cycles. If a cycle is unavoidable temporarily, record it with the reason and removal condition.
- Cross-feature imports must target a documented public operation; do not import private DOM renderers just to refresh a screen.
- Keep worker code independent of DOM and feature UI.
- When an import changes, update this page and the ownership map in the same commit.

## How to inspect impact before editing

1. Identify the owning module from [FEATURE-OWNERSHIP.md](FEATURE-OWNERSHIP.md).
2. Search direct imports of that module and all imports made by it.
3. Trace the affected record fields and shared policies.
4. Check for cycles before adding a new edge.
5. Update the map from actual imports, not memory or intended architecture.
