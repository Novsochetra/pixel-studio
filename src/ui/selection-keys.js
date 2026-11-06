import { commit, currentFrames, currentLayer, selectFrame } from './actions.js';
import {
  clearSelected,
  liftPixels,
  moveSelected,
  rectSelection,
  stampPixels,
} from '../editor/selection.js';
import { toast } from './dom.js';
import { shiftCurrentFrame } from './frame-move.js';

const ARROWS = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };

function nudge(app, [dx, dy]) {
  const layer = currentLayer(app.store.state);
  let selection = app.store.state.selection;
  commit(app, 'Move', [layer], () => {
    selection = moveSelected(layer.sprite, selection, dx, dy);
  });
  app.store.set({ selection });
}

function paste(app) {
  const layer = currentLayer(app.store.state);
  let selection = null;
  commit(app, 'Paste', [layer], () => {
    selection = stampPixels(layer.sprite, app.clipboard, 0, 0);
  });
  app.store.set({ selection, tool: 'select' });
  toast('Pasted where it was copied from. Drag it or use the arrow keys to place it.');
}

function selectAll(app) {
  const { canvas } = app.store.state.project;
  const corner = [canvas.width - 1, canvas.height - 1];
  app.store.set({ selection: rectSelection(canvas, [0, 0], corner), tool: 'select' });
}

function copy(app, cut) {
  const { state } = app.store;
  const layer = currentLayer(state);
  app.clipboard = liftPixels(layer.sprite, state.selection);

  if (cut) {
    commit(app, 'Cut', [layer], () => clearSelected(layer.sprite, state.selection));
  }
}

function eraseSelected(app) {
  const { state } = app.store;
  const layer = currentLayer(state);
  commit(app, 'Delete', [layer], () => clearSelected(layer.sprite, state.selection));
}

function stepFrame(app, step) {
  const { state } = app.store;
  const count = currentFrames(state).length;
  selectFrame(app, (state.at.frame + step + count) % count);
}

// What each key does, and when it applies: { when(state, app), run(app, event) }. ⌘ keys first.
const COMMAND_KEYS = {
  a: { when: () => true, run: selectAll },
  c: { when: (state) => state.selection, run: (app) => copy(app, false) },
  x: { when: (state) => state.selection, run: (app) => copy(app, true) },
  v: { when: (state, app) => app.clipboard?.length, run: paste },
};

const PLAIN_KEYS = {
  delete: { when: (state) => state.selection, run: eraseSelected },
  backspace: { when: (state) => state.selection, run: eraseSelected },
  escape: { when: (state) => state.selection, run: (app) => app.store.set({ selection: null }) },
  ',': { when: () => true, run: (app) => stepFrame(app, -1) },
  '.': { when: () => true, run: (app) => stepFrame(app, 1) },
};

// an arrow nudges the selection, or with Move frame on, the whole frame
function arrowKey([dx, dy]) {
  return {
    when: (state) => state.selection || state.tool === 'moveframe',
    run(app, event) {
      const step = event.shiftKey ? 10 : 1;
      const move = app.store.state.selection ? nudge : shiftCurrentFrame;
      move(app, [dx * step, dy * step]);
    },
  };
}

// erasing and letting go work with ⌘ or Ctrl held too, as ⌘⌫ is how a Mac deletes
const WITH_COMMAND_TOO = new Set(['delete', 'backspace', 'escape']);

function handlerFor(key, command) {
  if (command) {
    return COMMAND_KEYS[key] ?? (WITH_COMMAND_TOO.has(key) ? PLAIN_KEYS[key] : undefined);
  }

  if (ARROWS[key]) {
    return arrowKey(ARROWS[key]);
  }

  return PLAIN_KEYS[key];
}

// Selection, clipboard and frame keys. Returns true when it handled the key.
export function handleSelectionKey(app, event, key, command) {
  const handler = handlerFor(key, command);

  if (!handler || !handler.when(app.store.state, app)) {
    return false;
  }

  handler.run(app, event);
  event.preventDefault();

  return true;
}
