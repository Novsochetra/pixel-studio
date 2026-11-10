import { linePoints } from './paint.js';

// The end of a drag held true: a line to the nearest eighth of a turn, a box to a square.
export function heldTrue(kind, [x0, y0], [x1, y1]) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const reach = Math.max(Math.abs(dx), Math.abs(dy));
  // a drag along one row or column still grows a square, down and to the right
  const diagonal = [x0 + (Math.sign(dx) || 1) * reach, y0 + (Math.sign(dy) || 1) * reach];

  if (kind !== 'line') {
    return diagonal;
  }

  const steep = Math.abs(dy) > 2 * Math.abs(dx);
  const flat = Math.abs(dx) > 2 * Math.abs(dy);

  if (flat) {
    return [x1, y0];
  }

  return steep ? [x0, y1] : diagonal;
}

const boxOf = ([x0, y0], [x1, y1]) => ({
  left: Math.min(x0, x1),
  top: Math.min(y0, y1),
  right: Math.max(x0, x1),
  bottom: Math.max(y0, y1),
});

// each row of the shape as [y, left, right], the pixels between them inside it
function boxRows({ left, top, right, bottom }) {
  const rows = [];

  for (let y = top; y <= bottom; y++) {
    rows.push([y, left, right]);
  }

  return rows;
}

// The oval that fills the box: each row runs as far as the oval reaches at the row's middle.
function ellipseRows({ left, top, right, bottom }) {
  const centreX = (left + right + 1) / 2;
  const centreY = (top + bottom + 1) / 2;
  const radiusX = (right - left + 1) / 2;
  const radiusY = (bottom - top + 1) / 2;
  const rows = [];

  for (let y = top; y <= bottom; y++) {
    const up = (y + 0.5 - centreY) / radiusY;
    const half = radiusX * Math.sqrt(Math.max(0, 1 - up * up));
    const reach = Math.max(0.5, half);

    // rounded the same way on both sides, so the oval is the same left and right
    rows.push([y, Math.ceil(centreX - reach - 0.5), Math.floor(centreX + reach - 0.5)]);
  }

  return rows;
}

// A row's pixels on the shape's edge: its two ends, and what the rows above and below leave bare.
function edgeOfRow(rows, index) {
  const [y, left, right] = rows[index];
  const points = [];

  for (let x = left; x <= right; x++) {
    const covered = [rows[index - 1], rows[index + 1]].every(
      (row) => row && x >= row[1] && x <= row[2],
    );

    if (!covered || x === left || x === right) {
      points.push([x, y]);
    }
  }

  return points;
}

function filledRow([y, left, right]) {
  const points = [];

  for (let x = left; x <= right; x++) {
    points.push([x, y]);
  }

  return points;
}

const ROWS = { rect: boxRows, ellipse: ellipseRows };

// The pixels of a line, a rectangle or an ellipse dragged from one pixel to another: its outline,
// or all of it when filled.
export function shapePoints(kind, from, to, { filled = false } = {}) {
  if (kind === 'line') {
    return linePoints(from[0], from[1], to[0], to[1]);
  }

  const rows = ROWS[kind](boxOf(from, to));

  return rows.flatMap((row, index) => (filled ? filledRow(row) : edgeOfRow(rows, index)));
}
