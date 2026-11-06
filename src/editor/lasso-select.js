import { linePoints } from './paint.js';
import { insideLoop } from '../model/body/lasso.js';

function loopBox(loop, { width, height }) {
  const xs = loop.map(([x]) => x);
  const ys = loop.map(([, y]) => y);

  return {
    left: Math.max(0, Math.min(...xs)),
    top: Math.max(0, Math.min(...ys)),
    right: Math.min(width - 1, Math.max(...xs)),
    bottom: Math.min(height - 1, Math.max(...ys)),
  };
}

// What a lasso holds: the pixels its loop passes over, closed back to where it began, and every
// pixel whose middle is inside it. A loop that never left its first pixel holds nothing.
export function lassoSelection({ width, height }, loop) {
  const cells = new Uint8Array(width * height);
  const mark = ([x, y]) => {
    if (x >= 0 && y >= 0 && x < width && y < height) {
      cells[y * width + x] = 1;
    }
  };

  loop.forEach((point, i) => linePoints(...point, ...loop[(i + 1) % loop.length]).forEach(mark));

  const middles = loop.map(([x, y]) => [x + 0.5, y + 0.5]);
  const box = loopBox(loop, { width, height });

  for (let y = box.top; y <= box.bottom; y++) {
    for (let x = box.left; x <= box.right; x++) {
      if (insideLoop(middles, [x + 0.5, y + 0.5])) {
        mark([x, y]);
      }
    }
  }

  return loop.length > 1 && cells.includes(1) ? { width, height, cells } : null;
}
