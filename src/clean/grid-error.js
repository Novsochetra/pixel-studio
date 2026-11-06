import { findOffset } from './profile.js';
import { cellStarts, snapLines, spans } from './lines.js';
import { median } from './numeric.js';

export function gridLines(prof, size, length) {
  return snapLines(cellStarts(findOffset(prof, size), size, length), prof, size);
}

function innerShade(rgb, width, [ya, yb], [xa, xb]) {
  const channels = [[], [], []];

  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const i = (y * width + x) * 3;

      channels[0].push(rgb[i]);
      channels[1].push(rgb[i + 1]);
      channels[2].push(rgb[i + 2]);
    }
  }

  return channels.map(median);
}

function cellError({ image, isBg }, rows, cols, inner) {
  const { width, rgb } = image;
  const [ya, yb] = rows;
  const [xa, xb] = cols;
  let shade = null;
  let total = 0;
  let count = 0;

  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const at = y * width + x;

      if (isBg[at]) {
        continue;
      }

      shade ??= innerShade(rgb, width, inner[0], inner[1]);
      total +=
        Math.abs(rgb[at * 3] - shade[0]) +
        Math.abs(rgb[at * 3 + 1] - shade[1]) +
        Math.abs(rgb[at * 3 + 2] - shade[2]);
      count++;
    }
  }

  return [total, count];
}

// how far the image is from its rebuild on a grid of cells sx by sy: mean colour error per sprite
// pixel
export function gridError(image, isBg, profs, [sx, sy]) {
  const { width, height } = image;
  const xs = gridLines(profs[0], sx, width);
  const ys = gridLines(profs[1], sy, height);
  const colOuter = spans(xs, sx, width, [0, 1]);
  const colInner = spans(xs, sx, width, [0.25, 0.75]);
  const rowOuter = spans(ys, sy, height, [0, 1]);
  const rowInner = spans(ys, sy, height, [0.25, 0.75]);
  let total = 0;
  let count = 0;

  rowOuter.forEach((rows, rowIndex) => {
    colOuter.forEach((cols, columnIndex) => {
      const [cellTotal, cellCount] = cellError({ image, isBg }, rows, cols, [
        rowInner[rowIndex],
        colInner[columnIndex],
      ]);

      total += cellTotal;
      count += cellCount;
    });
  });

  return total / Math.max(count, 1);
}
