import { bounds, getPixel, CLEAR } from '../model/sprite.js';
import { compositeFrame } from '../model/composite.js';

// where the character stands in the art: the centre of the legs and the bottom row of the feet
export function artAnchor(sprite) {
  const box = bounds(sprite);

  if (!box) {
    return { x: Math.floor(sprite.width / 2), y: sprite.height - 1 };
  }

  const from = box.bottom - Math.max(1, Math.floor((box.bottom - box.top) / 4));
  let total = 0;
  let count = 0;

  for (let y = from; y < box.bottom; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (getPixel(sprite, x, y) !== CLEAR) {
        total += x;
        count++;
      }
    }
  }

  return { x: Math.round(total / count), y: box.bottom - 1 };
}

// the smallest frame (with a pixel to spare each side) that holds every frame of the animation,
// a foot or a sliding leg below the standing feet included
// one frame size for every animation given, as they share one manifest frame
export function fittedFrame(project, animations, anchor, pad = 1) {
  let left = 0;
  let right = 0;
  let top = 0;
  let below = 0;

  const entries = [animations].flat().flatMap((animation) => Object.values(animation.directions));

  for (const entry of entries) {
    for (const frame of entry.frames) {
      const box = bounds(compositeFrame(frame, project.canvas.width, project.canvas.height));

      if (box) {
        left = Math.min(left, box.left - anchor.x);
        right = Math.max(right, box.right - 1 - anchor.x);
        top = Math.min(top, box.top - anchor.y);
        below = Math.max(below, box.bottom - 1 - anchor.y);
      }
    }
  }

  const half = Math.max(-left, right) + pad;

  return { frameWidth: half * 2 + 1, frameHeight: -top + 1 + pad + below + (below ? pad : 0), anchorX: half, anchorY: -top + pad };
}
