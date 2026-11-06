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

// drag the selected pixels: each move redraws them from where the drag began
export function moveSelection(app, start) {
  const layer = currentLayer(app.store.state);
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
