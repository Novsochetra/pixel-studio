import { commit, commitSelected, currentFrames, currentLayer, selectFrame } from './actions.js';
import { liftPixels, rectSelection } from '../editor/selection.js';
import { eraseSelection, floatPiece, moveLifted, pieceOnCanvas } from '../editor/floating.js';
import { toast } from './dom.js';
import { shiftPickedLayers } from './layer-move.js';
import { forHands, keyNames } from './platform-keys.js';

const ARROWS = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };

const SAME_RUN_MS = 1000;

// Key after key, a run of nudges is one move to undo: ten presses were ten steps back.
function nudge(app, [dx, dy]) {
  const layer = currentLayer(app.store.state);
  const inRun = performance.now() - (app.nudgedAt ?? -Infinity) < SAME_RUN_MS;
  let selection = app.store.state.selection;

  const moved = commitSelected(app, 'Move', [layer], () => {
    selection = moveLifted(layer.sprite, selection, [dx, dy]);
  });

  if (moved && inRun) {
    app.history.joinLast();
  }

  app.nudgedAt = moved ? performance.now() : app.nudgedAt;
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

  const piece = pieceOnCanvas(app.clipboard, layer.sprite);
  const pasted = commitSelected(app, 'Paste', [layer], () => {
    selection = floatPiece(layer.sprite, piece);
  });

  if (pasted === null) {
    return;
  }

  app.store.set({ selection, tool: 'select' });
  const where =
    piece === app.clipboard ? 'where it was copied from' : 'in the middle of the canvas';

  toast(
    forHands(
      `Pasted ${where}. Drag it or use the arrow keys to place it.`,
      `Pasted ${where}. Drag it to place it.`,
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

  // refused on a hidden layer, it says why: "Cut." over that said it had worked
  if (
    cut &&
    commit(app, 'Cut', [layer], () => eraseSelection(layer.sprite, state.selection)) === null
  ) {
    return;
  }

  // the Copy button says so: the keys copied without a word, and nothing showed they had
  toast(keyNames(`${cut ? 'Cut' : 'Copied'}. Paste it in any frame with ⌘V.`));
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

const letGo = (app) => app.store.set({ selection: null });

const COMMAND_KEYS = {
  a: { when: () => true, run: selectAll },
  c: { when: (state) => state.selection, run: (app) => copy(app, false) },
  x: { when: (state) => state.selection, run: (app) => copy(app, true) },
  v: { when: () => true, run: paste },
};

const PLAIN_KEYS = {
  delete: { when: (state) => state.selection, run: eraseSelected },
  backspace: { when: (state) => state.selection, run: eraseSelected },
  escape: { when: (state) => state.selection, run: letGo },
  // as Done is: not with the keys on a control, whose own key Enter is
  enter: {
    when: (state) => state.selection && document.activeElement === document.body,
    run: letGo,
  },
  ',': { when: () => true, run: (app) => stepFrame(app, -1) },
  '.': { when: () => true, run: (app) => stepFrame(app, 1) },
};

export const arrowsMoveArt = (state) => Boolean(state.selection || state.tool === 'move');

function arrowKey([dx, dy]) {
  return {
    when: arrowsMoveArt,
    run(app, event) {
      const step = event.shiftKey ? 10 : 1;
      const move = app.store.state.selection ? nudge : shiftPickedLayers;

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
