import { CLEAR, getPixel, setPixel } from '../model/sprite.js';

// every point on the line between two pixels (Bresenham)
export function linePoints(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;

  for (;;) {
    points.push([x, y]);

    if (x === x1 && y === y1) {
      return points;
    }

    const twice = 2 * err;

    if (twice >= dy) {
      err += dy;
      x += sx;
    }

    if (twice <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// the pixel itself, plus its mirror across the symmetry line (x + mirrorX = axisSum)
export function mirrored(x, y, symmetry) {
  if (!symmetry?.on) {
    return [[x, y]];
  }

  const mirror = symmetry.axisSum - x;

  return mirror === x ? [[x, y]] : [[x, y], [mirror, y]];
}

// May this pixel be painted? With "paint only over" set, only pixels of that colour can change.
export function canPaint(sprite, x, y, paintOver) {
  return paintOver === null || paintOver === undefined || getPixel(sprite, x, y) === paintOver;
}

export function paintPoint(sprite, x, y, color, options = {}) {
  const changed = [];

  for (const [px, py] of mirrored(x, y, options.symmetry)) {
    const before = getPixel(sprite, px, py);

    if (canPaint(sprite, px, py, options.paintOver) && setPixel(sprite, px, py, color)) {
      changed.push({ x: px, y: py, before });
    }
  }

  return changed;
}

// All pixels of one colour connected (4-way) to the start take the new colour.
export function floodFill(sprite, x, y, color, options = {}) {
  const changed = [];

  for (const [sx, sy] of mirrored(x, y, options.symmetry)) {
    const target = getPixel(sprite, sx, sy);

    if (target === color || sx < 0 || sy < 0 || sx >= sprite.width || sy >= sprite.height) {
      continue;
    }

    const stack = [[sx, sy]];

    while (stack.length) {
      const [px, py] = stack.pop();

      if (getPixel(sprite, px, py) !== target || px < 0 || py < 0 || px >= sprite.width || py >= sprite.height) {
        continue;
      }

      setPixel(sprite, px, py, color);
      changed.push({ x: px, y: py, before: target });
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  return changed;
}

// every pixel of one colour, anywhere in the sprite
export function replaceColor(sprite, from, to) {
  let count = 0;

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (getPixel(sprite, x, y) === from && from !== to) {
        setPixel(sprite, x, y, to);
        count++;
      }
    }
  }

  return count;
}

export const ERASE = CLEAR;
