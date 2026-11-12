import { libraryState } from './state/library.js';
import { readerState } from './state/reader.js';
import { editorState } from './state/editor.js';
import { navigationState } from './state/navigation.js';
export { freshBook } from './domain/book.js';
export { setScreen } from './presentation/navigation.js';

// Transitional compatibility facade for the composition root and any legacy
// callers. Feature modules should import their own state slice directly.
export const state = {};
for (const key of [...Object.keys(libraryState), ...Object.keys(readerState), ...Object.keys(editorState), ...Object.keys(navigationState)]) {
  const owner = key in libraryState ? libraryState : key in readerState ? readerState : key in editorState ? editorState : navigationState;
  Object.defineProperty(state, key, { enumerable: true, get: () => owner[key], set: value => { owner[key] = value; } });
}
