import { uid } from '../utils.js';

// Canonical constructor for new book records. Existing persisted records are
// never normalized through this factory.
export function freshBook(source, title) {
  return { id: uid(), kind: 'book', source, title, author: '', cover: '', chapters: [], locked: false, bookmarks: [], highlights: [], progress: { chapter: 0, offset: 0 }, updated: Date.now() };
}
