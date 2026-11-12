/**
 * Shared book-level capability policy.
 *
 * Keep domain authorization here; presentation code may use can() to disable
 * controls, but every mutating feature must also check its capability at the
 * operation boundary. Unknown capabilities fail closed.
 *
 * The current lock is an editing lock, not a reading/export lock. It does not
 * prevent reading, progress updates, bookmarks, highlights, history, or export.
 */
const BOOK_CAPABILITIES = Object.freeze({
  'book.edit-metadata': 'unlocked-book',
  'book.edit-tags': 'unlocked-book',
  'book.edit-cover': 'unlocked-book',
  'book.delete': 'unlocked-book',
  'chapter.create': 'unlocked-book',
  'chapter.edit': 'unlocked-book',
  'chapter.delete': 'unlocked-book',
  'chapter.rename': 'unlocked-book',
  'chapter.reorder': 'unlocked-book',
  'gallery.manage': 'unlocked-book',
  'novel-links.manage': 'unlocked-book',
  'chapter-links.manage': 'unlocked-book'
});

export const BOOK_CAPABILITY_NAMES = Object.freeze(Object.keys(BOOK_CAPABILITIES));

export function can(book, capability) {
  const rule = BOOK_CAPABILITIES[capability];
  if (!rule || !book) return false;
  if (rule === 'unlocked-book') return !book.locked;
  return false;
}
