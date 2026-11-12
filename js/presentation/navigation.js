import { navigationState } from '../state/navigation.js';

// Screen presentation transition. Domain/features update their owned state;
// this adapter performs the DOM transition for the current responsive shell.
export function setScreen(name) {
  navigationState.screen = name;
  for (const id of ['paste', 'library', 'book', 'editor', 'reader']) document.getElementById('screen-' + id).classList.toggle('hidden', id !== name);
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('readerPanel').classList.add('hidden');
  document.getElementById('scrim').classList.add('hidden');
  window.scrollTo(0, 0);
}
