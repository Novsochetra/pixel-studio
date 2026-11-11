import { cloneSprite } from '../model/sprite.js';
import { colourSelection, isSelected, rectSelection } from '../editor/selection.js';
import { currentLayer } from './actions.js';
import { moveLifted } from '../editor/floating.js';
import { combineSelections, lassoPiece, lassoSelection } from '../editor/lasso-select.js';
import { refusesPaint } from './body/body-lock.js';
import { pickLayerAt } from './pick-layer.js';
import { toast } from './dom.js';

// drag the selected pixels: each move redraws them from where the drag began
export function moveSelection(app, start) {
  const layer = currentLayer(app.store.state);

  if (refusesPaint([layer])) {
    return null;
  }

  const before = cloneSprite(layer.sprite);
  const startMask = app.store.state.selection;
  const place = (shift) => {
    layer.sprite.pixels.set(before.pixels);

    return moveLifted(layer.sprite, startMask, shift);
  };

  return {
    move([x, y]) {
      app.store.set({ selection: place([x - start[0], y - start[1]]) });
    },
    // a second finger makes the drag a pinch: the pixels go back where they were
    cancel() {
      layer.sprite.pixels.set(before.pixels);
      app.store.set({ selection: startMask });
    },
    end() {
      if (app.history.record('Move', [{ layer, before }])) {
        app.history.keepSelection(startMask);
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
  const hadSelection = Boolean(state.selection);
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
      if (moved) {
        return;
      }

      app.store.set({ selection: null });

      // a click that only lets go of a selection stays here, ready to draw the next one
      if (pickLayerAt(app, start) && !hadSelection) {
        app.store.set({ tool: 'move' });
      }
    },
  };
}

export function wand(app, [x, y], everywhere) {
  // a drag that starts on the selection moves it, as with the box and the Lasso: fingers have no
  // arrow keys to move it with
  if (!everywhere && isSelected(app.store.state.selection, x, y)) {
    return moveSelection(app, [x, y]);
  }

  pickLayerAt(app, [x, y]);
  const selection = colourSelection(currentLayer(app.store.state).sprite, x, y, everywhere);

  app.store.set({ selection });

  if (!selection) {
    toast('There is no colour there to select: pick a pixel of the art.');
  }

  return null;
}

// Shift adds and Alt takes away; with neither held, what the selection's bar is set to (Add,
// Take away), as fingers have no keys to hold
export function lassoModeFor(event, set = 'new') {
  if (event.shiftKey) {
    return 'add';
  }

  return event.altKey ? 'remove' : set;
}

// A loop drawn round a part selects it; with Shift it adds to the selection, with Alt it takes
// away, and a click with either is the one pixel under it. A drag that starts on a selected pixel
// moves the selection, as a box selection's does. The loop shows while it is drawn.
export function lasso(app, start, event) {
  const { selection, project, lassoMode } = app.store.state;
  const mode = lassoModeFor(event, selection ? lassoMode : 'new');

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

      if (mode === 'new' && loop.length === 1) {
        pickLayerAt(app, start);
      }
    },
    cancel() {
      app.store.set({ lassoLoop: null });
    },
  };
}
