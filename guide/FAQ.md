# Architecture FAQ

## Is Quiet Reader supposed to become microservices?

No. It is a static, local-first browser application. A modular monolith is the appropriate default. Microservices would add deployment, networking, authentication, synchronization, and operational complexity without solving the current module-boundary problem.

## Should every feature be split into many tiny files?

No. Split by cohesive responsibility and stable ownership. A feature can have a small number of files. A file move is not an architectural improvement unless it makes dependencies and ownership clearer.

## Where should a new feature go?

Find the owning domain in [FEATURE-OWNERSHIP.md](FEATURE-OWNERSHIP.md). If it spans features, keep the workflow orchestration in the composition/application layer and call each owner's public operation. Do not make unrelated modules share private DOM functions.

## How should features interconnect?

Use direct function calls for explicit, immediate operations with one clear owner. Use events only when multiple independent subscribers need to react to a completed fact. Do not introduce a global event bus for ordinary calls.

## Should all lock checks be universal?

Only rules with shared semantics should be centralized. Book editing lock is a shared capability policy. Individual gallery-image locks are a separate feature-owned policy. Reading, progress, bookmarks, highlights and export are intentionally not blocked by the book editing lock.

## Why keep a central policy function if the UI already disables buttons?

Disabled controls are presentation, not an operation boundary. Operations can be called from other modules, stale screens, or programmatic paths. The operation must independently check the same policy before mutation.

## Should shared state be replaced immediately?

No. The current `state.js` object is broadly imported and mutable. Replace it gradually: extract a cohesive operation/store, migrate a small set of callers, preserve compatibility, then remove old access only after all callers are accounted for.

## Should circular imports be fixed all at once?

No. Start with the confirmed reader/highlights cycle. Identify the smallest interface seam, move one direction of the dependency, inspect initialization semantics, and then verify reader rendering and highlight interactions. Avoid broad rewrites.

## Does a new frontend or mobile app require a new database?

Not necessarily. A new interface should implement the same documented domain/data contract and use a compatible repository adapter. It must not depend on current DOM structure or private in-memory state. A separate sync/account backend would be an additional layer, not a reason to change the record contract casually.

## How do we keep the guide from becoming stale?

Use [CHANGE-PROTOCOL.md](CHANGE-PROTOCOL.md) and the checklist. Update the inventory and completion record every time; update detailed maps only where the change affects them, while recording that each was reviewed. The source code remains authoritative if documentation and code disagree; reconcile the mismatch in the same task.

## Are tests optional because this is a personal app?

Testing can be proportionate, but a personal app still contains valuable local data. Architecture and data changes deserve smoke tests and backup/restore checks. If tests are intentionally not run, say so and avoid claiming runtime correctness.

## V3 boundary and state questions

### Why are feature implementation files still at the top level?

The public facades under `js/features/` establish supported import boundaries without requiring a risky mass file move. Physical relocation can happen later, feature by feature, if it improves navigation and doesn't create unnecessary churn.

### Where should another feature import a function from?

Import it from the owning `js/features/<feature>/index.js` facade. Avoid importing implementation files such as `library.js` or `reader.js` directly. The facade is the supported cross-feature API.

### Why is there still a state.js file?

It is a compatibility facade for the app composition root and any remaining legacy callers. Runtime data is owned by `state/library.js`, `state/reader.js`, `state/editor.js`, and `state/navigation.js`. New feature implementations should import their specific slice.

### Does the new state structure change saved books?

No. These are in-memory application state slices. The persisted book/chapter records, IndexedDB database, and backup formats are unchanged.

### Why is there both a domain book factory and a library feature?

`domain/book.js` constructs a new book record with the existing default shape. The library feature owns library workflows and presentation. The factory does not normalize or migrate existing records.

### Why is setScreen outside state?

The selected screen value is navigation state. Manipulating DOM visibility, drawers, overlays, and scroll position is presentation behaviour, so it lives in `presentation/navigation.js`.

### Why keep db.js if features use itemRepository?

`db.js` is a compatibility facade for old call sites and external imports. New feature code uses the explicit repository contract. It can be retired only after a repository-wide usage audit and a separate change.
