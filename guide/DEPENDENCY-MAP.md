# Dependency map

**Current snapshot:** V3 feature-boundary and state/persistence refactor, 12 November 2026. This is the current import graph after the V3 feature-boundary refactor; it replaces the original V3 baseline.

## Runtime composition

```text
index.html
  └─ app.js (composition root)
       ├─ features/*/index.js (public feature facades)
       │    └─ feature implementation modules
       ├─ presentation/navigation.js
       ├─ shared/policies.js
       ├─ state.js (compatibility facade only)
       └─ infrastructure/persistence/item-repository.js
```

## Current implementation dependency table

| Implementation / layer | Direct dependencies |
|---|---|
| `app.js` | feature facades (including backup/EPUB/PDF), shared policies, state compatibility facade, presentation navigation, item repository, utilities, themes, image preview |
| `library.js` | library/reader/navigation state slices, domain book factory, presentation navigation, item repository, utilities, reader facade, history facade, shared policies |
| `reader.js` | library/reader state slices, presentation navigation, item repository, utilities, history facade, Kokoro TTS |
| `editor.js` | library/editor state slices, presentation navigation, domain book factory, item repository, utilities, library facade, history facade, image preview, shared policies |
| `chapter-tools.js` | library state, item repository, utilities, library facade, history facade, shared policies |
| `highlights.js` | library/reader state slices, item repository, utilities, reader facade |
| `history.js` | library state, item repository, utilities |
| `links.js` | library/reader state slices, item repository, utilities, reader facade, shared policies |
| `galleries.js` | library state, domain book factory, item repository, utilities, library/history/image-translation facades, image preview, shared policies |
| `translation.js` | library/reader state slices, utilities, reader and marks facades |
| `image-translation.js` | utilities, translation facade |
| `backup.js` | item repository, themes, utilities |
| `epub.js` | library state, domain book factory, item repository, library facade, utilities |
| `pdf.js` | domain book factory, item repository, library facade, utilities |
| `library-counts.js` | item repository |
| `features/*/index.js` | only the implementation modules owned by that facade |
| `state.js` | state slices; re-exports book factory and presentation navigation for compatibility |
| `state/*.js` | no feature imports; plain feature-owned in-memory state |
| `domain/book.js` | UID utility; no feature imports |
| `presentation/navigation.js` | navigation state slice; DOM APIs |
| `shared/policies.js` | no imports; pure capability decisions |
| `infrastructure/persistence/item-repository.js` | browser IndexedDB APIs only |
| `db.js` | compatibility re-export of persistence contract |

## Public facade rules

- The composition root imports feature operations from `js/features/*/index.js`.
- Cross-feature implementation imports target a facade, never another feature's private implementation file.
- A facade exports the feature's supported operations, not its entire implementation module.
- A feature must not import `app.js` or call back into the composition root.
- State is imported from the owning slice. The aggregate `state.js` facade is transitional.
- Persistence is imported through the `itemRepository` contract. The old `db.js` named functions are compatibility-only.

## Cycle status

The former `reader.js → highlights.js → reader.js` cycle is removed:
- reader owns the point at which highlight rendering occurs;
- app registers the marks renderer through `setHighlightRenderer`;
- marks uses the reader facade for navigation.

No direct feature implementation cycle is intended in the current facade graph. When adding a new cross-feature edge, inspect the full facade chain, not only the implementation import line.

## Change-impact workflow

1. Find the owner in [FEATURE-OWNERSHIP.md](FEATURE-OWNERSHIP.md).
2. Start from its public facade and identify implementation modules.
3. Inspect all facade consumers and the implementation's imports.
4. Trace the state slices and persisted record fields touched.
5. Confirm the dependency does not point back through another facade.
6. Update this map in the same commit.


## Added V3 collection boundary (12 Nov 2026)

- `app.js` and `library.js` consume the collections public facade `features/collections/index.js`.
- The facade delegates to `collections.js`, which uses `itemRepository` and shared DOM utilities; it does not import library or app modules.
- `service-worker.js` pre-caches both the implementation and facade.
- No reverse dependency from collections into library, reader, or app is introduced.
