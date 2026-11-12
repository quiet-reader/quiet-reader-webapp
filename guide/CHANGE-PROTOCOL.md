# Change and documentation protocol

This is the required workflow for every feature, bug fix, UI change, refactor, or infrastructure change. Its purpose is to make future work faster by preventing repeated repository archaeology and undocumented side effects.

## Phase 1 — classify the request

Write down:
- requested outcome and explicit non-goals;
- whether behaviour should change or only internals;
- target branch;
- whether this is inquiry-only or implementation authorization;
- data, UI, offline, privacy, and compatibility constraints.

Do not infer permission to change live deployment, stable branches, user data, or hosting configuration.

## Phase 2 — locate ownership

1. Read `guide/README.md`.
2. Find the owner in [FEATURE-OWNERSHIP.md](FEATURE-OWNERSHIP.md).
3. Read the owner's module and documented public API.
4. Identify the operation entry points and all UI callers.
5. If no owner exists, define one before adding code.

Do not put a feature's domain rule in `app.js` merely because the event originates there.

## Phase 3 — trace dependencies and state

1. Check [DEPENDENCY-MAP.md](DEPENDENCY-MAP.md).
2. Inspect current imports and search all direct callers; the map may be stale.
3. Identify cycles and avoid adding new ones.
4. Trace reads/writes of `state.js`, IndexedDB, localStorage, assets, workers, and service-worker caches.
5. Identify every dependent feature and the exact fields/operations it relies on.
6. Prefer stable IDs and explicit function arguments over reaching into global mutable state.

## Phase 4 — inspect shared policies

Check [SHARED-POLICIES.md](SHARED-POLICIES.md):
- Does the change touch an existing cross-feature rule?
- Does a new rule need one shared decision function?
- Is it truly shared, or should it remain feature-local?
- Is the rule enforced at both UI and operation boundaries?
- Are exemptions (reading/export etc.) explicit?

Never duplicate an existing policy as a new local conditional without a reason.

## Phase 5 — protect the data contract

Read [DATA-CONTRACT.md](DATA-CONTRACT.md) and DATA-COMPATIBILITY. Record:
- record families and fields read/written;
- positional references and stable IDs;
- backup/import/export impact;
- local preference keys;
- whether any migration is needed (default: no).

If persisted semantics change, stop and design the migration/compatibility plan before implementation.

## Phase 6 — implement the smallest safe seam

- Keep one owner for each operation.
- Use the existing repository adapter; do not create another database.
- Avoid a large rewrite or mass file move.
- Expose a narrow public operation for cross-feature callers.
- Keep optional providers/workers isolated.
- Preserve old behaviour unless explicitly changed.
- Update the service-worker cache version and shell list when adding/changing a shell asset.

## Phase 7 — verify honestly

Run the checks that are practical for the change. For every check, distinguish:
- run and passed;
- run and failed;
- not run;
- statically inspected only.

For this static app, a minimal manual smoke test can use a local static server and test the affected flow in the browser. Architecture-wide changes should also cover library open/read/edit, representative backup/restore, desktop/mobile layouts, and offline update. Never claim browser testing based on source inspection.

## Phase 8 — synchronize documentation in the same change

| Document | Update when |
|---|---|
| FEATURE-INVENTORY | Every change: dated record and changed capability/module |
| FEATURE-OWNERSHIP | Owner, API, data ownership, or caller changes |
| DEPENDENCY-MAP | Imports, cycles, layer direction, or public cross-feature edges change |
| SHARED-POLICIES | Shared authorization/validation/lifecycle rule changes |
| DATA-CONTRACT + DATA-COMPATIBILITY | Stored fields, IDs, relationships, persistence, preferences, import/export, backup, migration |
| ARCHITECTURE | Structural boundaries, runtime, state, platform, infrastructure |
| FAQ | A recurring question/answer or architectural recommendation changes |
| ARCHITECTURE-STATUS | Assessment or known debt materially changes |
| FEATURE-CHECKLIST | Every change: completion record and actual verification status |
| README / guide index | User-facing capabilities, setup, or required guide order changes |

Every document must be reviewed. If unchanged, explicitly say "reviewed — no change" in the completion record. Do not rewrite unchanged documents for the sake of activity.

## Phase 9 — commit and report

- Commit code and relevant documentation together.
- Keep the commit message descriptive.
- Report branch, commit, exact files, behaviour/data impact, checks run, checks not run, and known debt.
- Compare against the intended base branch; do not imply a feature branch is live or deployed.
- Update [ARCHITECTURE-STATUS.md](ARCHITECTURE-STATUS.md) when a phase changes the maturity assessment.

## Recommended change record template

```md
### YYYY-MM-DD — short change title
- Request / non-goals:
- Owner:
- Public API / dependencies:
- Shared policies:
- Data read/written:
- UI entry points:
- Behaviour changed / preserved:
- Tests run / passed:
- Tests not run:
- Documentation reviewed / updated:
- Known debt / next seam:
```
