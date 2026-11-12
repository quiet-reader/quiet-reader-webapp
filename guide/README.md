# Quiet Reader engineering guide

> **Mandatory pre-implementation reference.** Before changing code, adding a feature, fixing a bug, changing UI, touching persistence, or restructuring modules, read this guide in order. Treat it as the project's engineering contract. If a proposed change conflicts with it, stop and resolve the conflict before implementation.

## Read in this order

1. [Architecture and dependency rules](ARCHITECTURE.md)
2. [Data preservation and compatibility contract](DATA-COMPATIBILITY.md)
3. [Current feature inventory](FEATURE-INVENTORY.md)
4. [Feature ownership map](FEATURE-OWNERSHIP.md)
5. [Dependency map](DEPENDENCY-MAP.md)
6. [Shared policy catalogue](SHARED-POLICIES.md)
7. [Stable data contract](DATA-CONTRACT.md)
8. [Change and documentation protocol](CHANGE-PROTOCOL.md)
9. [Architecture FAQ](FAQ.md)
10. [Current architecture assessment](ARCHITECTURE-STATUS.md)
11. [Feature-change checklist](FEATURE-CHECKLIST.md)

## Purpose

Quiet Reader is a local-first reading and library application. The architecture may evolve, but the application must keep its existing capabilities and must not make users' books, chapters, images, annotations, history, settings, or backups unreadable. Desktop and mobile may have different presentation layers; they must share the same domain behaviour and persisted data contracts.

## Non-negotiable rules

- Preserve existing user-visible behaviour unless a change is explicitly requested and approved.
- Preserve existing stored data. Never reset, replace, silently normalize destructively, or reinterpret user records as a side effect of a UI or architecture redesign.
- Never make a new interface, device layout, feature module, or future app version depend on a private in-memory shape that cannot be read through a documented stable data contract.
- Keep persistence and backup formats versioned, documented, validated, and backward-compatible.
- Any data migration must be explicit, reversible where practical, tested against representative legacy data, and must never run as an incidental side effect of rendering.
- Do not remove or rewrite a feature until its current behaviour, data dependencies, and regression tests are understood.
- New features must be registered in the feature inventory and must update the relevant architecture/data docs and this checklist in the same change.
- Do not change GitHub Pages publishing settings, the stable branch, or the live site as part of architecture work unless separately authorized.

## Current baseline

This guide was initially written against `V1-feature` at commit `3b7532de22922a311971a3cf8ba3b1edcaba2e4c` (12 November 2026). It records the repository state and recent feature work observed at that point. It is a maintained snapshot, not permission to assume the code still matches it. Before each implementation, inspect the current branch and update this inventory when the code has changed.

## How to maintain this guide

For every feature addition, bug fix, refactor, migration, UI change, or dependency change:

1. Read this guide before touching code.
2. Inspect the current implementation and identify the owning feature, shared services, persisted records, imports/exports, and UI entry points.
3. Update [FEATURE-INVENTORY.md](FEATURE-INVENTORY.md) if capabilities, module ownership, entry points, data, or dependencies changed.
4. Update [ARCHITECTURE.md](ARCHITECTURE.md) if boundaries, dependency rules, runtime structure, or platform presentation changed.
5. Update [DATA-COMPATIBILITY.md](DATA-COMPATIBILITY.md) if stored records, backup formats, import/export, local settings, or migration behaviour changed.
6. Complete [FEATURE-CHECKLIST.md](FEATURE-CHECKLIST.md), including regression tests and a note of anything not tested.
7. Commit the code and guide updates together. Do not let documentation drift behind the implementation.

If a change is blocked or a test cannot be run, record that clearly. Never mark an unverified item as tested.

## Architecture migration status

The V2 architecture work is intended to be incremental. The guide and the first persistence boundary have been added. The persistence adapter preserves the existing database and record payloads; broader feature-boundary and desktop/mobile presentation work remains. Each subsequent commit must make small, reviewable changes and preserve a working application at every stage.

## V3 architecture operating model

V3 adds explicit ownership, dependency, policy, and data-contract references. Read these before choosing where a change belongs. The [change protocol](CHANGE-PROTOCOL.md) is the required procedure for keeping the implementation and documentation synchronized.

The current architecture is still a modular monolith with legacy cross-feature imports. The maps describe the code that exists; they are not claims that every boundary has already been enforced. When code and a map disagree, inspect the code, correct the map in the same change, and record the discrepancy.

The V3 shared policy module is `js/shared/policies.js`. It is intentionally small and contains book-level capability decisions only. Feature modules remain responsible for checking the relevant capability at the operation boundary; the UI may use the same decision to disable controls. Unknown capabilities deny access.

## Documentation update rule

Every code change must update the change record in `FEATURE-INVENTORY.md` and the completion record in `FEATURE-CHECKLIST.md`. Update ownership, dependency, policy, data-contract, FAQ, and architecture-status pages whenever the change affects their subject. Do not make irrelevant edits merely to create activity; explicitly mark a document as reviewed/no change in the change record when a change is architecture-wide.

## V3 feature-boundary implementation

The current preferred module paths are documented in [FEATURE-OWNERSHIP.md](FEATURE-OWNERSHIP.md) and [DEPENDENCY-MAP.md](DEPENDENCY-MAP.md).

- Feature consumers import through `js/features/<feature>/index.js` facades.
- Feature implementation modules import their owned state slices from `js/state/`.
- New-book construction belongs to `js/domain/book.js`.
- DOM screen transitions belong to `js/presentation/navigation.js`.
- Persistence uses `itemRepository` from `js/infrastructure/persistence/item-repository.js`.
- `js/state.js` and `js/db.js` are compatibility facades. Do not add new feature dependencies on them.

The compatibility facades are not to be removed until all remaining legacy callers have been migrated and the change has been verified.
