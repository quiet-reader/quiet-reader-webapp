# Architecture status and assessment

**Snapshot:** V3 foundation phase, 12 November 2026  
**Branch:** `V3-feature`  
**Assessment basis:** source inspection and static edits only; no browser runtime testing in this phase.

This page is a maturity assessment, not a claim of production certification. Ratings describe the current repository after the V3 change.

| Area | Current state | Assessment | Remaining work |
|---|---|---|---|
| Feature discoverability | Feature ownership register and public entry points documented | Improved substantially | Keep the map synchronized; formalize facades gradually |
| Dependency visibility | Import adjacency and known cycles documented | Improved substantially | Add automated graph check later; remove cycles incrementally |
| Feature isolation | Modules are separated by topic but import one another's rendering/state helpers | Partial | Separate application operations from DOM presentation; reduce private cross-feature imports |
| Shared policy consistency | Book-level capabilities have one pure policy function and several consumers use it | Improved, incomplete | Migrate remaining direct display checks; enumerate every mutation guard |
| Shared application state | One mutable `state.js` object remains widely imported | Weak / legacy debt | Extract feature-owned state boundaries without changing persisted data |
| Persistence boundary | IndexedDB repository adapter exists behind `db.js` facade | Early foundation | Migrate feature calls to explicit repository API gradually; add transaction/error contract |
| Data compatibility | Existing DB and backup formats documented; no schema change in V3 | Strong documentation, runtime verification limited | Build synthetic fixtures and verify unknown-field preservation and restore |
| Backup/import/export | ZIP + legacy JSON support documented and implemented | Important existing strength | Browser round-trip verification after future persistence changes |
| Cross-feature contracts | Ownership and shared policy catalogue now exist | Improved | Add narrow public facades and API contracts as seams are extracted |
| Automated tests | No established automated regression suite identified | Weak | Add lightweight browser/manual smoke checklist or targeted tests when feasible |
| Desktop/mobile presentation | Same responsive web interface, not separate shells | Partial | Keep feature parity; separate presentation only if a concrete need emerges |
| Offline/static hosting | Service worker shell cache; new policy module added to shell and cache bumped | Existing approach preserved | Verify install/update on browser after deployment |
| Documentation maintenance | Mandatory guide, ownership/dependency/policy/data/change/FAQ/status pages | Stronger foundation | Every change must follow the protocol; documentation still requires manual discipline |
| Accounts/cloud sync | Not implemented; local IndexedDB remains source of truth | Not a current requirement | If added, design sync metadata/conflicts separately without coupling record schema to UI |

## What V3 improved

1. A future contributor can locate the feature owner and understand the current public entry points without first reconstructing the whole repository.
2. The observed dependency graph and confirmed reader/highlights cycle are visible.
3. The book editing lock has a shared, pure capability decision function. UI disabling and operation guards can use the same semantics.
4. The persisted data contract is summarized separately from UI architecture and the backup ZIP format.
5. The change protocol defines exactly which docs must be reviewed and when they must be updated.
6. The guide distinguishes current code from intended architecture and records known debt rather than presenting aspirational diagrams as implemented facts.

## What V3 did not solve

- It did not remove the reader/highlights cycle.
- It did not replace shared mutable state.
- It did not fully separate feature operations from DOM rendering.
- It did not move every existing cross-feature import behind a public facade.
- It did not introduce automated tests or prove browser runtime correctness.
- It did not add separate desktop/mobile apps, accounts, cloud sync, or a new database schema.

## Recommended next phases

1. **V3.x — capability-policy completion:** audit every book-level mutation and direct lock check; use the central policy consistently without changing exemptions.
2. **V4 candidate — reader/marks seam:** remove the reader/highlights circular import with a narrow navigation/rendering interface.
3. **V4.x — feature operation facades:** separate library domain operations from DOM rendering; migrate editor/chapter tools/gallery callers.
4. **V5 candidate — state ownership:** reduce direct global state mutation by extracting one cohesive feature at a time.
5. **Later — verification:** add a small repeatable browser smoke-test path and synthetic data fixture before any schema or backup migration.

Do not start the next phase by moving every file. Choose one high-value seam, map callers, preserve compatibility, and update this status after verification.
