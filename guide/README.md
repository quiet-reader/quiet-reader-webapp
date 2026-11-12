# Quiet Reader engineering guide

> **Mandatory pre-implementation reference.** Before changing code, adding a feature, fixing a bug, changing UI, touching persistence, or restructuring modules, read this guide in order. Treat it as the project's engineering contract. If a proposed change conflicts with it, stop and resolve the conflict before implementation.

## Read in this order

1. [Architecture and dependency rules](ARCHITECTURE.md)
2. [Data preservation and compatibility contract](DATA-COMPATIBILITY.md)
3. [Current feature inventory](FEATURE-INVENTORY.md)
4. [Feature-change checklist](FEATURE-CHECKLIST.md)

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

The V2 architecture work is intended to be incremental. This initial guide commit documents the rules and baseline. It does not itself migrate application code or user data. Subsequent commits must make small, reviewable changes and preserve a working application at every stage.
