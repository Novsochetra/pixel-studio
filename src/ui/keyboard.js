import { TOOLS } from './tools.js';
import { flipCurrent, redo, undo } from './actions.js';
import { handleSelectionKey } from './selection-keys.js';
import { openShortcuts } from './shortcuts.js';

function typing(event) {
  const tag = event.target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target.isContentEditable;
}

export function bindKeyboard(app) {
  document.addEventListener('keyup', (event) => {
    if (event.key === ' ') {
      app.spaceHeld = false;
      document.body.classList.remove('panning');
    }
  });
  document.addEventListener('keydown', (event) => {
    // space pans only from the page itself: on a focused button it still presses the button
    if (event.key === ' ' && (event.target === document.body || event.target.tagName === 'CANVAS')) {
      event.preventDefault();
      app.spaceHeld = true;
      document.body.classList.add('panning');

      return;
    }

    if (event.key === '?' && !typing(event) && !document.querySelector('.sheet-backdrop')) {
      openShortcuts();

      return;
    }

    if (typing(event) || document.querySelector('.sheet-backdrop')) {
      return;
    }

    const { state } = app.store;
    const command = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    if (handleSelectionKey(app, event, key, command)) {
      return;
    }

    if (command && key === 'z') {
      event.preventDefault();
      (event.shiftKey ? redo : undo)(app);
    } else if (command && key === 'y') {
      event.preventDefault();
      redo(app);
    } else if (!command && (key === '+' || key === '=')) {
      app.store.set({ zoom: Math.min(24, state.zoom + 1) });
    } else if (!command && key === '-') {
      app.store.set({ zoom: Math.max(1, state.zoom - 1) });
    } else if (!command && key === 'm') {
      app.store.set({ symmetry: { ...state.symmetry, on: !state.symmetry.on } });
    } else if (!command && key === 'f' && event.shiftKey) {
      flipCurrent(app);
    } else if (!command && !event.altKey) {
      const tool = TOOLS.find((t) => t.key === key);

      if (tool) {
        app.store.set({ tool: tool.id, mode: 'edit' });
      }
    }
  });
}
