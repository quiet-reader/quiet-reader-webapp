# Architecture and design rules

## 1. Product and architectural goals

Quiet Reader remains a local-first, static-hostable web application. Its core value is a private library and reading experience that works in the browser without requiring an account or application server.

The target is a **modular monolith**: one application with clear feature boundaries and shared infrastructure. Do not introduce microservices, micro-frontends, a mandatory backend, or a framework rewrite merely for architectural fashion.

Priorities, in order:

1. Preserve user data and existing feature behaviour.
2. Make feature boundaries understandable and prevent accidental cross-feature breakage.
3. Keep desktop and mobile interfaces independently evolvable while sharing domain logic.
4. Keep offline/local-first operation and static hosting.
5. Improve performance, resilience, accessibility, and testability without unnecessary complexity.

## 2. Layer model

Use a one-way dependency direction:

`Presentation -> Application -> Domain`
`Infrastructure -> Application/Domain contracts`

- **Presentation:** desktop shell, mobile shell, shared visual components, dialogs, navigation, responsive styles, keyboard/touch interactions. It displays state and sends user intent; it does not own business rules or persistence formats.
- **Application:** use cases and orchestration, e.g. create book, open chapter, save highlight, import EPUB, restore backup, translate image text. It coordinates features and services.
- **Domain:** stable concepts and rules for books, chapters, assets, reading progress, bookmarks, highlights, annotations, history, translations, and settings. Keep it independent of DOM and browser storage.
- **Infrastructure:** IndexedDB, localStorage adapters, browser APIs, file readers/writers, Web Workers, service worker/cache, OCR/TTS/translation provider adapters.
- **Composition/bootstrap:** starts the app, wires dependencies, registers feature entry points, and selects the presentation shell. It should not become a second monolithic controller.

A layer may depend on a lower-level public contract, not on another feature's private implementation.

## 3. Feature boundaries

The current code is organized as ES modules under `js/`. The target is feature-oriented directories with a public entry point and private implementation. Example only; do not move files mechanically without understanding imports and behaviour:

```text
src/
  app/                 # bootstrap and composition
  domain/              # stable entities, invariants, IDs, schemas
  application/         # use cases and shared orchestration
  infrastructure/
    persistence/       # IndexedDB and local settings adapters
    files/             # import/export adapters
    workers/           # OCR, TTS and CPU-heavy work
    providers/         # translation/TTS/OCR provider adapters
  features/
    library/
    reader/
    editor/
    galleries/
    history/
    highlights/
    translation/
    image-translation/
    backup/
    epub/
    pdf/
    links/
    appearance/
  presentation/
    desktop/
    mobile/
    shared/
  styles/
  tests/
```

Each feature should expose a small public API (or manifest/registration contract) and keep internal DOM, state, and helpers private. Other features must not import its private files. Prefer an explicit application use case or shared domain service over direct feature-to-feature imports.

### Dependency rules

- No circular imports.
- No feature imports another feature's private file.
- No direct DOM manipulation from domain or persistence modules.
- No persistence schema knowledge in presentation components.
- No feature should mutate another feature's private state.
- Shared state must be minimal, explicit, and owned by a clear application/domain service.
- Use a typed/documented event contract only where asynchronous decoupling genuinely helps. Do not add a global event bus as a substitute for clear ownership.
- Keep CSS scoped by feature or presentation surface; avoid broad selectors that unexpectedly restyle unrelated UI.
- A failure in an optional feature (e.g. OCR or Kokoro) must not prevent the library and ordinary reader from starting.

## 4. Desktop and mobile presentation

Desktop and mobile are two presentation shells over the same application/domain services and same persisted records.

- **Desktop:** can use side navigation, persistent panels, wider toolbars, hover affordances, context menus, keyboard shortcuts, and multi-column layouts.
- **Mobile:** can use bottom navigation, compact toolbars, touch-sized controls, bottom sheets, and context-aware menus.
- Both shells must expose the same core capabilities, even if controls are placed differently.
- Do not fork business logic or create separate databases for mobile and desktop.
- Choose presentation using responsive layout and capability signals (viewport/container size, pointer/hover capability, reduced motion), not user-agent sniffing as the primary mechanism.
- Preserve direct links, focus behaviour, keyboard accessibility, screen-reader labels, and touch operation.
- Test narrow phones, large phones, tablets, and desktop widths. A responsive layout must not merely shrink desktop controls.

## 5. State and data flow

- Persisted domain data is authoritative; UI state is temporary.
- Read and write through application use cases and persistence adapters, not arbitrary direct IndexedDB calls from UI modules.
- Keep transient UI state separate from persisted records.
- Use stable IDs for books, chapters, images/assets, highlights, bookmarks, and history events. Do not rely on array position as identity.
- Where existing records currently use positional references (for example chapter indexes), preserve compatibility and add a carefully designed mapping only when required. Never silently change the meaning of an existing index.
- Treat lock state and permissions as domain rules, not just disabled buttons in the UI.
- Use transactions for related multi-record updates.

## 6. Persistence and assets

Current observed persistence is IndexedDB database `quietbook-v2`, database version 1, object store `items`, key path `id`. The application currently stores complete book-like records, including chapters and image data, in this store. Do not rename, delete, recreate, or upgrade this database casually.

The target may introduce repositories and additional stores, but:
- retain the existing database and records as the migration source;
- do not move image data out of records until an explicit migration is designed and proven safe;
- if asset separation is later justified, preserve stable asset IDs and keep a compatibility reader for old embedded data;
- make migrations idempotent, transactionally safe where possible, and independently testable;
- keep backups portable and readable outside the app.

Do not perform data migration just because the app starts or a UI shell changes. A schema change requires a migration plan, validation, rollback/recovery strategy, and tests using legacy fixtures.

## 7. Provider and worker boundaries

OCR, TTS, translation, EPUB/PDF parsing, and other CPU/network-bound work should be behind explicit adapters. UI should not know provider-specific details. Workers should communicate through stable request/response messages and report progress/errors.

- Kokoro TTS remains an optional on-device engine; do not block system TTS or basic reading on its model download or WebGPU support.
- Image OCR runs locally in the browser in the current implementation; recognized text is then sent to the user-selected translation provider. Keep this privacy distinction explicit in UI and docs.
- Translation provider credentials and text transmission must be handled deliberately and documented.
- Do not introduce cloud processing as a hidden fallback.

## 8. Performance and resilience

Apply only where evidence justifies it:

- lazy-load rarely used feature code;
- virtualize very large lists when needed;
- debounce and index broad library/chapter searches;
- load image previews/thumbnails lazily and avoid duplicating large data URLs in memory;
- use workers for expensive OCR, parsing, and speech generation;
- keep service-worker caches versioned and ensure new module assets are included;
- handle quota errors, corrupted imports, missing providers, worker crashes, and unavailable browser APIs without losing existing records;
- do not silently swallow failed writes or partial imports.

## 9. Testing and release gates

Minimum checks for a structural change:

- module/import graph has no accidental cycles;
- application boots from static hosting and local server;
- library opens and existing books remain visible;
- reader navigation, progress, search, bookmarks, highlights, and chapter editing work;
- gallery, image insertion, image paste preview, OCR/translation, and image history work;
- imports/exports (EPUB, PDF, TXT, JSON/ZIP backup) work;
- lock/unlock rules still hold;
- desktop and mobile layouts both expose all required capabilities;
- offline shell and service-worker cache update correctly;
- restore is backward-compatible and additive/upserting as documented.

Record actual commands and outcomes. Static inspection is not browser testing. If a browser test is unavailable, state that clearly and do not claim the application was runtime-tested.

## 10. Migration strategy

Migrate incrementally:

1. **Baseline:** document current modules, feature behaviour, persistence, backup formats, and regression flows. This guide is the baseline record.
2. **Characterization:** add tests around existing behaviour and legacy data before moving code.
3. **Seams:** introduce shared contracts/adapters without changing stored records or UI behaviour.
4. **Feature extraction:** move one cohesive feature at a time behind a public API; run its regression tests.
5. **Presentation split:** create desktop/mobile shells only after shared use cases are stable; keep the same domain services.
6. **Persistence evolution:** only if justified, introduce explicit schema migrations with old-record compatibility and restore tests.
7. **Performance hardening:** measure before optimizing; avoid broad rewrites.

Each phase must leave the branch buildable and usable. Do not combine a full data migration, visual redesign, and broad feature rewrite in one change.

## 11. Explicit non-goals

- No mandatory account, server, cloud database, or remote sync.
- No separate mobile application with a separate data model.
- No framework rewrite without a concrete measured need.
- No destructive normalization or automatic data conversion during rendering.
- No removal of existing features merely to simplify the architecture.
- No speculative abstraction that adds more complexity than the problem it solves.
