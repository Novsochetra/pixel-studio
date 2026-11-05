import { commit, currentFrames, currentLayer, selectFrame } from './actions.js';
import { clearSelected, liftPixels, moveSelected, rectSelection, stampPixels } from '../editor/selection.js';
import { toast } from './dom.js';

const ARROWS = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };

function nudge(app, [dx, dy], big) {
  const layer = currentLayer(app.store.state);
  const step = big ? 10 : 1;
  let selection = app.store.state.selection;
  commit(app, 'Move', [layer], () => {
    selection = moveSelected(layer.sprite, selection, dx * step, dy * step);
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

// Selection, clipboard and frame keys. Returns true when it handled the key.
export function handleSelectionKey(app, event, key, command) {
  const { state } = app.store;
  const layer = currentLayer(state);

  if (command && key === 'a') {
    app.store.set({ selection: rectSelection(state.project.canvas.width, state.project.canvas.height, 0, 0, state.project.canvas.width - 1, state.project.canvas.height - 1), tool: 'select' });
  } else if (command && (key === 'c' || key === 'x') && state.selection) {
    app.clipboard = liftPixels(layer.sprite, state.selection);

    if (key === 'x') {
      commit(app, 'Cut', [layer], () => clearSelected(layer.sprite, state.selection));
    }
  } else if (command && key === 'v' && app.clipboard?.length) {
    paste(app);
  } else if (ARROWS[key] && state.selection && !command) {
    nudge(app, ARROWS[key], event.shiftKey);
  } else if ((key === 'delete' || key === 'backspace') && state.selection) {
    commit(app, 'Delete', [layer], () => clearSelected(layer.sprite, state.selection));
  } else if (key === 'escape' && state.selection) {
    app.store.set({ selection: null });
  } else if (!command && (key === ',' || key === '.')) {
    const count = currentFrames(state).length;
    selectFrame(app, (state.at.frame + (key === '.' ? 1 : count - 1)) % count);
  } else {
    return false;
  }

  event.preventDefault();

  return true;
}
