import { cloneSprite } from '../model/sprite.js';
import {
  clearSelected,
  colourSelection,
  isSelected,
  liftPixels,
  rectSelection,
  stampPixels,
} from '../editor/selection.js';
import { currentLayer } from './actions.js';
import { combineSelections, lassoPiece, lassoSelection } from '../editor/lasso-select.js';
import { refusesPaint } from './body/body-lock.js';

// drag the selected pixels: each move redraws them from where the drag began
export function moveSelection(app, start) {
  const layer = currentLayer(app.store.state);

  if (refusesPaint([layer])) {
    return null;
  }

  const before = cloneSprite(layer.sprite);
  const lifted = liftPixels(before, app.store.state.selection);
  const startMask = app.store.state.selection;

  return {
    move([x, y]) {
      layer.sprite.pixels.set(before.pixels);
      clearSelected(layer.sprite, startMask);
      const selection = stampPixels(layer.sprite, lifted, x - start[0], y - start[1]);
      app.store.set({ selection });
    },
    end() {
      if (app.history.record('Move', [{ layer, before }])) {
        app.saver.markLayers([layer.id]);
        app.store.touch('pixels');
      }
    },
  };
}

export function select(app, start) {
  const { state } = app.store;

  if (isSelected(state.selection, start[0], start[1])) {
    return moveSelection(app, start);
  }

  const { width, height } = state.project.canvas;
  let moved = false;
  app.store.set({
    selection: rectSelection({ width, height }, start, start),
  });

  return {
    move([x, y]) {
      moved ||= x !== start[0] || y !== start[1];
      app.store.set({ selection: rectSelection({ width, height }, start, [x, y]) });
    },
    end() {
      if (!moved) {
        app.store.set({ selection: null });
      }
    },
  };
}

export function wand(app, [x, y], everywhere) {
  app.store.set({
    selection: colourSelection(currentLayer(app.store.state).sprite, x, y, everywhere),
  });

  return null;
}

const lassoMode = (event) => {
  if (event.shiftKey) {
    return 'add';
  }

  return event.altKey ? 'remove' : 'new';
};

// A loop drawn round a part selects it; with Shift it adds to the selection, with Alt it takes
// away, and a click with either is the one pixel under it. A drag that starts on a selected pixel
// moves the selection, as a box selection's does. The loop shows while it is drawn.
export function lasso(app, start, event) {
  const { selection, project } = app.store.state;
  const mode = lassoMode(event);

  if (mode === 'new' && isSelected(selection, ...start)) {
    return moveSelection(app, start);
  }

  const loop = [start];

  app.store.set({ selection: mode === 'new' ? null : selection, lassoLoop: [...loop] });

  return {
    move([x, y]) {
      const [lastX, lastY] = loop.at(-1);

      if (x !== lastX || y !== lastY) {
        loop.push([x, y]);
        app.store.set({ lassoLoop: [...loop] });
      }
    },
    end() {
      const piece =
        mode === 'new' ? lassoSelection(project.canvas, loop) : lassoPiece(project.canvas, loop);

      app.store.set({
        lassoLoop: null,
        selection: combineSelections(app.store.state.selection, piece, mode),
      });
    },
    cancel() {
      app.store.set({ lassoLoop: null });
    },
  };
}
