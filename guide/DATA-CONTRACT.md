# Quiet Reader stable data contract

This is the concise contract for features and future interfaces. The detailed preservation and migration procedure remains in [DATA-COMPATIBILITY.md](DATA-COMPATIBILITY.md), and the serialized backup structure is in [backup-format.md](../docs/backup-format.md).

## Compatibility principles

- Persisted data is a domain contract, not a view-model owned by one screen.
- Stable IDs identify records and related entities. Do not use array positions as new identities.
- Preserve unknown fields during updates and round-trips.
- A UI may omit a field from display; it must not erase that field when saving another property.
- Import/export/backup and future desktop/mobile interfaces must share the same semantic contract.
- A feature may write only fields it owns and must preserve all other fields.
- Never perform migrations during rendering or ordinary startup without an explicit versioned migration path.

## Current persistence envelope

| Item | Current value |
|---|---|
| Storage | Browser IndexedDB |
| Database | `quietbook-v2` |
| Database version | `1` |
| Object store | `items` |
| Key path | `id` |
| Repository adapter | `js/infrastructure/persistence/item-repository.js` |
| Compatibility facade | `js/db.js` |

The adapter preserves existing record payloads and does not create a second database.

## Current record families

### Book

- Required identity/discriminator: `id`, `kind: "book"`.
- Existing descriptive fields include `source`, `title`, `author`, `cover`; optional metadata includes tags, notes and rating.
- Chapters are nested in `chapters[]`; chapter records may contain title, text, image references/data, timestamps, and edit history.
- Book-level state includes `locked`, bookmarks, highlights, progress, reading/editing history and relationship/link fields.
- Gallery books use `source: "gallery"` and nested `gallery` data with image metadata, image locks, notes and viewing history.

### Saved paste

- `kind: "paste"`, stable `id`, title/text and update timestamp.
- Saved paste records are separate from a book until the user explicitly saves one as a novel.

### Local preferences

Known examples include theme, library view/sort, and tag color preferences stored in localStorage. The list is not guaranteed exhaustive. Before changing a preference key, search all reads/writes and preserve existing values where possible.

## Chapter identity and positional references

Chapter indexes are positional and can change when chapters are reordered or deleted. Before changing chapter order, inspect and preserve/remap every positional reference: progress, bookmarks, reading history, and incoming/outgoing chapter links. Do not assume a chapter's title is a unique identifier.

## Link contract

Novel/chapter relationships are stored with local book/chapter data and are included in backup. Link changes must preserve stable target book IDs and correctly handle chapter index changes. Automatic corresponding-chapter pairs and manually created links have different ownership/refresh semantics; see feature ownership and inventory before changing them.

## Backup and restore

The current ZIP backup includes a manifest, library records, saved pastes, extracted assets, and checksums. Restore is additive/upserting by stable record ID and should preserve unrelated local records. Legacy JSON backup versions 2 and 3 remain supported. See [backup-format.md](../docs/backup-format.md).

## Schema evolution

Any schema change requires:
1. A written before/after contract and reason.
2. A representative synthetic fixture covering all affected record families.
3. A versioned, idempotent migration with backup/recovery plan.
4. Preservation of unknown fields.
5. Verification of counts, IDs, links, images, notes, histories, and settings.
6. Backup export/restore compatibility checks.
7. Updates to this contract, DATA-COMPATIBILITY, backup docs, inventory, and checklist.

No V3 schema migration is introduced.

## V3 persistence API refinement

New feature code imports the generic `itemRepository` contract directly from `js/infrastructure/persistence/item-repository.js`:

| Method | Contract |
|---|---|
| `getAll()` | Returns all records from the existing `items` object store |
| `get(id)` | Returns one record by stable ID, or `null` if absent |
| `save(record)` | Upserts one record by the existing `id` key path |
| `delete(id)` | Deletes one record by ID |
| `saveMany(records)` | Writes a batch in one IndexedDB read-write transaction |

The contract deliberately stays generic. Feature/domain validation belongs above this adapter. `db.js` remains a compatibility facade exposing the old function names; new feature code must not add new imports from it.

The new in-memory state slices and public feature facades do not change the persisted record format. The database remains `quietbook-v2`, version `1`, store `items`, key path `id`. No migration or data normalization is introduced.
