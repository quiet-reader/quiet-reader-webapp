# Shared policy catalogue

A shared policy is a rule that must mean the same thing across multiple features. It should be pure, explicit, and tested or statically verified at both the presentation and operation boundaries.

## Book-level capability policy

Implementation: `js/shared/policies.js`

Public API:
- `can(book, capability): boolean`
- `BOOK_CAPABILITY_NAMES: readonly string[]`

Rules:
- Missing book → deny.
- Unknown capability → deny (fail closed).
- Known capability → allow only when `book.locked !== true`.
- No DOM, toast, persistence, or global application state is accessed.
- The policy is derived from the existing `book.locked` field; it is not stored separately.

| Capability | Meaning | Current enforcement owners |
|---|---|---|
| `book.edit-metadata` | Change book details/rating | App and library UI |
| `book.edit-tags` | Change tags | App |
| `book.edit-cover` | Change cover/paste cover | App |
| `book.delete` | Delete a library book | Library |
| `chapter.create` | Create/add/import a chapter | Editor, library UI |
| `chapter.edit` | Edit chapter or insert chapter image | Editor |
| `chapter.delete` | Delete chapter | Editor |
| `chapter.rename` | Batch rename chapters | Chapter tools |
| `chapter.reorder` | Change chapter order | App and library UI |
| `gallery.manage` | Add/import/paste gallery images | Galleries |
| `novel-links.manage` | Edit novel relationships | Links |
| `chapter-links.manage` | Edit chapter relationships | Links and library UI |

### Enforcement pattern

1. Presentation uses `can(book, capability)` to disable or hide an action.
2. The operation calls the same policy immediately before changing state or writing.
3. The operation decides how to communicate denial (toast, return value, or error). The policy itself stays UI-independent.
4. Add a capability name to the policy registry and this table together.
5. Unknown names must remain denied.

Example:

```js
import { can } from './shared/policies.js';

if (!can(book, 'chapter.rename')) {
  toast('Unlock this novel before renaming chapters');
  return;
}
```

### Scope boundaries

The book lock is an editing lock. It does not block reading, progress, bookmarks, highlights, history, or export. Do not add those capabilities to the locked set unless the product behaviour is explicitly changed.

Gallery image locks are separate: an individual image may be locked while the gallery book is unlocked. Their rules are currently implemented inside `galleries.js` and are not represented by `can(book, ...)`. Do not pass an image object to the book capability policy.

## Other cross-feature policies (catalogue status)

| Policy | Current location | Status / next step |
|---|---|---|
| Book editing lock | `js/shared/policies.js` | Centralized core capability function; some display-only checks still use `book.locked` directly |
| Individual gallery-image lock | `js/galleries.js` | Feature-local; keep separate unless another feature needs it |
| Data preservation / unknown fields | `guide/DATA-CONTRACT.md`, persistence/backup code | Contract documented; runtime enforcement is distributed |
| Stable identity and link/index remapping | Links, chapter reorder, backup | Feature-local rules; document before changing |
| Import/restore validation | Backup/import modules | Feature-owned, not yet a common validation service |
| History recording | `js/history.js` | Shared operation exists; call sites remain distributed |
| Error/toast presentation | `js/utils.js` | UI utility, not a domain policy |

Do not centralize every conditional. Centralize a rule only when multiple features need the same decision and the semantics are stable.

## Change procedure

When adding or changing a shared rule:
- name the capability/policy by the action, not by a screen or button;
- state the data it reads and whether it has side effects (prefer none);
- list every operation and UI that enforces it;
- update this catalogue and feature ownership;
- ensure the policy is checked at the operation boundary, not only in markup;
- document any intentionally exempt operations;
- record what was statically inspected and what was actually run.

## V3 follow-up enforcement audit

The shared book capability check is now used at the operation boundary for:
- book metadata/rating, tags, and cover paste;
- book deletion;
- chapter create/edit/delete/rename/reorder, including save-time re-checks and reader-to-editor navigation;
- novel/chapter link managers and chapter-index entry;
- gallery-level add/import/paste and book-level image rename/reorder/lock/note/delete operations.

Library controls use the same policy for the corresponding actions. Direct reads of `book.locked` that remain for lock labels, status text, or the lock/unlock control are presentation/state operations, not independent authorization rules.

Individual gallery-image locks remain checked alongside the book-level capability. The combined rule is: the book must permit gallery management and the specific image must be unlocked for operations that alter that image; the gallery lock itself may be toggled only when the book permits gallery management.
