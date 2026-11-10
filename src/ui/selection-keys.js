import { commit, commitSelected, currentFrames, currentLayer, selectFrame } from './actions.js';
import { liftPixels, moveSelected, rectSelection } from '../editor/selection.js';
import { eraseSelection, floatPiece, moveFloating, shiftOnCanvas } from '../editor/floating.js';
import { toast } from './dom.js';
import { shiftCurrentFrame } from './frame-move.js';
import { shiftCurrentLayer } from './layer-move.js';
import { forHands } from './platform-keys.js';

const ARROWS = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };

function nudge(app, [dx, dy]) {
  const layer = currentLayer(app.store.state);
  let selection = app.store.state.selection;

  commitSelected(app, 'Move', [layer], () => {
    selection = selection.floating
      ? moveFloating(layer.sprite, selection, dx, dy)
      : moveSelected(
          layer.sprite,
          selection,
          ...shiftOnCanvas(liftPixels(layer.sprite, selection), layer.sprite, [dx, dy]),
        );
  });
  app.store.set({ selection });
}

// the copied pixels as a piece floating over the art, to drag or nudge into place
export function paste(app) {
  const layer = currentLayer(app.store.state);
  let selection = null;

  if (!app.clipboard?.length) {
    toast('Nothing copied yet: select some pixels and Copy them first.');

    return;
  }

  const pasted = commitSelected(app, 'Paste', [layer], () => {
    selection = floatPiece(layer.sprite, app.clipboard);
  });

  if (pasted === null) {
    return;
  }

  app.store.set({ selection, tool: 'select', mode: 'edit' });
  toast(
    forHands(
      'Pasted where it was copied from. Drag it or use the arrow keys to place it.',
      'Pasted where it was copied from. Drag it to place it.',
    ),
  );
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
    commit(app, 'Cut', [layer], () => eraseSelection(layer.sprite, state.selection));
  }
}

function eraseSelected(app) {
  const { state } = app.store;
  const layer = currentLayer(state);

  commit(app, 'Delete', [layer], () => eraseSelection(layer.sprite, state.selection));
}

function stepFrame(app, step) {
  const { state } = app.store;
  const count = currentFrames(state).length;

  selectFrame(app, (state.at.frame + step + count) % count);
}

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

const TOOL_ARROWS = { moveframe: shiftCurrentFrame, movelayer: shiftCurrentLayer };

export const arrowsMoveArt = (state) => Boolean(state.selection || TOOL_ARROWS[state.tool]);

function arrowKey([dx, dy]) {
  return {
    when: arrowsMoveArt,
    run(app, event) {
      const step = event.shiftKey ? 10 : 1;
      const { selection, tool } = app.store.state;
      const move = selection ? nudge : TOOL_ARROWS[tool];

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

export function handleSelectionKey(app, event, key, command) {
  const handler = handlerFor(key, command);

  if (!handler || !handler.when(app.store.state, app)) {
    return false;
  }

  handler.run(app, event);
  event.preventDefault();

  return true;
}
