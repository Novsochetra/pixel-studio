import { currentLayer } from './actions.js';
import { refloat } from '../editor/floating.js';

// After every change to the pixels (a stroke, a fill, a swap, an undo), a piece floating over
// the art takes what is painted on it, so its next move carries the paint along (refloat).
export function keepFloatingPainted(app) {
  app.store.subscribe((state, patch) => {
    if ((patch.pixels || patch.project) && state.selection?.floating) {
      state.selection = refloat(currentLayer(state).sprite, state.selection);
    }
  });
}
