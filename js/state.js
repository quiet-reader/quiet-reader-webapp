import { uid } from './utils.js';
import { libraryState } from './state/library.js';
import { readerState } from './state/reader.js';
import { editorState } from './state/editor.js';
import { navigationState } from './state/navigation.js';

// Transitional compatibility facade. New feature code should import its own
// state slice directly; this preserves legacy callers while migration proceeds.
export const state = {};
for (const key of [...Object.keys(libraryState), ...Object.keys(readerState), ...Object.keys(editorState), ...Object.keys(navigationState)]) {
  const owner = key in libraryState ? libraryState : key in readerState ? readerState : key in editorState ? editorState : navigationState;
  Object.defineProperty(state, key, { enumerable: true, get: () => owner[key], set: value => { owner[key] = value; } });
}
export function freshBook(source, title) {
  return { id: uid(), kind: 'book', source, title, author: '', cover: '', chapters: [], locked: false, bookmarks: [], highlights: [], progress: { chapter: 0, offset: 0 }, updated: Date.now() };
}
export function setScreen(name) {
  navigationState.screen = name;
  for (const id of ['paste', 'library', 'book', 'editor', 'reader']) document.getElementById('screen-' + id).classList.toggle('hidden', id !== name);
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('readerPanel').classList.add('hidden');
  document.getElementById('scrim').classList.add('hidden');
  window.scrollTo(0, 0);
}
