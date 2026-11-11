import { fingerTap } from './finger-tap.js';
import { redo, undo } from './undo.js';

const TAPPED = { 2: undo, 3: redo };

// Undo is at the top of a phone's screen, a hand away from the art: two fingers tapped on the
// canvas take the last step back and three bring it again, as drawing apps there have it.
// Wraps what places a finger and what lets it go, so the taps are counted where both are told.
export function withTaps(app, { place, finish }) {
  const tap = fingerTap();
  let zoom = 0;

  return {
    place(event) {
      place(event);

      if (tap.at(event)) {
        zoom = app.store.state.zoom;
      }
    },

    // Fingers spread a little are within a tap's reach and enough to zoom a step when far in:
    // what zoomed the canvas was a pinch, and takes no step back as well.
    finish(event) {
      finish(event);
      const fingers = tap.lifted(event);

      if (app.store.state.zoom === zoom) {
        TAPPED[fingers]?.(app);
      }
    },
  };
}
