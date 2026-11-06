import { brushPixels, linePoints } from './paint.js';

// Selecting pixel by pixel: each brush mark along a drag adds its pixels to the selection, or with
// `remove`, takes them off. A selection with nothing left in it is no selection.
export function selectAlong(selection, { canvas, brush, symmetry }, { from, to, remove }) {
  const { width, height } = canvas;
  const cells = selection ? new Uint8Array(selection.cells) : new Uint8Array(width * height);

  for (const point of linePoints(...from, ...to)) {
    for (const [x, y] of brushPixels(point, { brush, symmetry })) {
      if (x >= 0 && y >= 0 && x < width && y < height) {
        cells[y * width + x] = remove ? 0 : 1;
      }
    }
  }

  return cells.includes(1) ? { width, height, cells } : null;
}
