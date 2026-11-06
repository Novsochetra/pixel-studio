import { medianColor } from './numeric.js';
import { cellStarts, snapLines, spans } from './lines.js';

function blockPixels(image, isBg, [ya, yb], [xa, xb]) {
  const { width, rgb } = image;
  const pixels = [];
  let bgCount = 0;

  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const at = y * width + x;

      pixels.push({ color: [rgb[at * 3], rgb[at * 3 + 1], rgb[at * 3 + 2]], bg: isBg[at] === 1 });
      bgCount += isBg[at];
    }
  }

  return { pixels, onBg: bgCount / pixels.length > 0.5 };
}

// the cell's colour by majority vote (near-identical shades vote together), and whether the
// background won
function cellColor(image, isBg, rows, cols) {
  const { pixels, onBg } = blockPixels(image, isBg, rows, cols);
  const voters = pixels.filter((pixel) => pixel.bg === onBg).map((pixel) => pixel.color);
  const groups = new Map();

  for (const color of voters) {
    const key = (color[0] >> 3) * 1024 + (color[1] >> 3) * 32 + (color[2] >> 3);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(color);
  }

  const keys = [...groups.keys()].sort((first, second) => first - second);
  const winner = keys.reduce((best, key) =>
    groups.get(key).length > groups.get(best).length ? key : best,
  );

  return { color: medianColor(groups.get(winner)).map(Math.trunc), onBg };
}

export function rebuild(image, isBg, grid) {
  const { width, height } = image;
  let xs = cellStarts(grid.ox, grid.sx, width);
  let ys = cellStarts(grid.oy, grid.sy, height);

  if (!grid.exact) {
    xs = snapLines(xs, grid.profs[0], grid.sx);
    ys = snapLines(ys, grid.profs[1], grid.sy);
  }

  // sample the inner 50% of each cell, away from blended borders (the whole cell if clean)
  const [lo, hi] = grid.exact ? [0, 1] : [0.25, 0.75];
  const colSpans = spans(xs, grid.sx, width, [lo, hi]);
  const rowSpans = spans(ys, grid.sy, height, [lo, hi]);
  const out = { width: colSpans.length, height: rowSpans.length };
  out.colors = new Uint8Array(out.width * out.height * 3);
  out.bg = new Uint8Array(out.width * out.height);

  rowSpans.forEach((rows, rowIndex) => {
    colSpans.forEach((cols, columnIndex) => {
      const { color, onBg } = cellColor(image, isBg, rows, cols);
      const at = rowIndex * out.width + columnIndex;

      out.colors.set(color, at * 3);
      out.bg[at] = onBg ? 1 : 0;
    });
  });

  return out;
}
