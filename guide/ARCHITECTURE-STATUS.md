# Architecture status and assessment

**Snapshot:** V3 feature-boundary refinement, 12 November 2026  
**Branch:** `V3-feature`  
**Assessment basis:** repository source inspection and static cross-reference checks. No browser runtime, backup round-trip, or automated tests were run in this phase.

Ratings assess architecture structure and discoverability, not runtime certification. Automated regression testing and separate desktop/mobile shells are intentionally deferred.

| Area | Current state after this phase | Assessment | Remaining work |
|---|---|---|---|
| Feature discoverability | Ownership map plus explicit public facade for each major feature | **Strong** | Keep facade exports and owner map synchronized |
| Dependency visibility | Current graph documented; direct reader/marks cycle removed | **Strong** | Check full facade chains when adding edges |
| Feature isolation | Cross-feature callers use feature facades; implementation files remain in legacy locations | **Strong improvement** | Move implementations only when useful; no mass move required |
| Shared policy consistency | Central book-capability policy with operation and UI guards | **Strong** | Continue auditing new mutation paths |
| Shared application state | Library, reader, editor, navigation slices; legacy aggregate facade retained for app compatibility | **Strong improvement** | Gradually remove aggregate facade use outside composition root |
| Persistence boundary | Generic IndexedDB repository contract; feature modules use it; db.js compatibility facade retained | **Strong improvement** | Add domain-specific repositories only when a real use case requires them |
| Data compatibility | Existing DB/record/backup contract unchanged and documented | **Strong** | Runtime round-trip verification remains outstanding |
| Cross-feature APIs | Explicit narrow facades for library, reader, chapters, marks, links, galleries, translation, image translation, history, backup, EPUB, PDF | **Strong** | Treat facade exports as the supported cross-feature entry points |
| Automated regression testing | No established automated suite identified | **Deferred by request** | Not included in this phase |
| Desktop/mobile separation | Current responsive interface; no separate shells | **Deferred by request** | User intends to address this later |
| Offline/static hosting | Service worker cache includes new state, domain, presentation and facade modules | **Preserved** | Browser update/cache behaviour not runtime-tested |
| Documentation maintenance | Ownership, dependency, policies, data, change protocol, FAQ, status, checklist | **Strong foundation** | Manual synchronization still required |
| Accounts/cloud sync | Not implemented | **Out of scope** | Separate future design |

## What changed in this phase

1. Split shared in-memory state into library, reader, editor, and navigation slices. The old `state.js` remains a compatibility facade; feature modules now import owned slices directly.
2. Moved new-book construction into `domain/book.js` and DOM screen transitions into `presentation/navigation.js`.
3. Added explicit feature API facades under `js/features/*/index.js`; app and cross-feature callers use those entry points.
4. Removed the direct reader/highlights circular import. The composition root registers the renderer callback with the reader.
5. Added `itemRepository` with `getAll`, `get`, `save`, `delete`, and `saveMany`; feature modules use it directly. `db.js` remains for compatibility.
6. Updated the service-worker shell cache and static file list for all new modules.

## What this phase deliberately did not do

- No persisted schema or IndexedDB version change.
- No record rewrite, migration, or backup-format change.
- No automated regression test framework.
- No desktop/mobile shell split.
- No broad physical file move or framework rewrite.
- No live-site deployment or publishing-setting change.

## Remaining quality caveats

- The compatibility state facade and db.js facade are intentional transition seams. New feature code should not add dependencies on them.
- Feature implementations remain at historical top-level paths; the facades establish API boundaries without a risky mass move.
- The repository adapter remains a generic item store, not a domain-specific book/chapter repository.
- Runtime behaviour, offline cache updates, and backup/restore round trips were not exercised in a browser. Architecture ratings do not imply those checks passed.

## Next recommended work

The architecture now has explicit boundaries. Future improvements should be driven by concrete feature needs: add narrow use-case functions when repeated orchestration appears, retire compatibility facades only after all consumers migrate, and keep the data contract stable. Do not add abstractions that do not remove real coupling.
