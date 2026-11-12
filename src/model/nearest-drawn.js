import { hasArt } from './frames.js';

// the frame nearest `index` with something drawn in it, the one before first; null if none has
export function nearestDrawn(frames, index) {
  for (let distance = 0; distance < frames.length; distance++) {
    for (const at of [index - distance, index + distance]) {
      if (frames[at] && hasArt(frames[at])) {
        return at;
      }
    }
  }

  return null;
}
