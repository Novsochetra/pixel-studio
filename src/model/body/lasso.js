import { CLEAR, getPixel } from '../sprite.js';

// A lasso is the loop a drag draws, in canvas pixels (fractions allowed). A pixel is inside when
// its middle is: a ray from it crosses the loop an odd number of times.
export function insideLoop(loop, [x, y]) {
  let inside = false;

  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [ax, ay] = loop[i];
    const [bx, by] = loop[j];

    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) {
      inside = !inside;
    }
  }

  return inside;
}

function loopBox(loop, { width, height }) {
  const xs = loop.map(([x]) => x);
  const ys = loop.map(([, y]) => y);

  return {
    left: Math.max(0, Math.floor(Math.min(...xs))),
    top: Math.max(0, Math.floor(Math.min(...ys))),
    right: Math.min(width, Math.ceil(Math.max(...xs))),
    bottom: Math.min(height, Math.ceil(Math.max(...ys))),
  };
}

// the art inside the loop goes to part `index` (-1: to none); returns how many pixels it took
export function lassoOwners(plan, { source, loop, index }) {
  if (loop.length < 3) {
    return 0;
  }

  const box = loopBox(loop, source);
  let taken = 0;

  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) {
      if (getPixel(source, x, y) !== CLEAR && insideLoop(loop, [x + 0.5, y + 0.5])) {
        plan.owners[y * source.width + x] = index;
        taken += 1;
      }
    }
  }

  return taken;
}
