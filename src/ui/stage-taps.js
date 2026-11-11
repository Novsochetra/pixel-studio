import { fingerTap } from './finger-tap.js';
import { redo, undo } from './undo.js';

const TAPPED = { 2: undo, 3: redo };

// Undo is at the top of a phone's screen, a hand away from the art: two fingers tapped on the
// canvas take the last step back and three bring it again, as drawing apps there have it.
// Wraps what places a finger and what lets it go, so the taps are counted where both are told.
export function withTaps(app, { place, finish }) {
  const tap = fingerTap();

  return {
    place(event) {
      place(event);
      tap.at(event);
    },

    finish(event) {
      finish(event);
      TAPPED[tap.lifted(event)]?.(app);
    },
  };
}
