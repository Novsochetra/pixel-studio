import { CLEAR, cloneSprite, getPixel, setPixel } from '../model/sprite.js';

const SIDES = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
const AROUND = [...SIDES, [-1, -1], [1, -1], [-1, 1], [1, 1]];

const isClear = (sprite, x, y) => getPixel(sprite, x, y) === CLEAR;
const touchesClear = (sprite, x, y) => SIDES.some(([dx, dy]) => isClear(sprite, x + dx, y + dy));

// the colour most used on the silhouette's edge: the outline
export function outlineColour(sprite) {
  const counts = new Map();

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const color = getPixel(sprite, x, y);

      if (color !== CLEAR && touchesClear(sprite, x, y)) {
        counts.set(color, (counts.get(color) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function eachPixel(sprite, visit) {
  const before = cloneSprite(sprite);
  let changed = 0;

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const next = visit(before, x, y);

      if (next !== undefined && setPixel(sprite, x, y, next)) {
        changed++;
      }
    }
  }

  return changed;
}

// a one-pixel outline around the whole silhouette, outside it
export function addOutline(sprite, colour) {
  return eachPixel(sprite, (before, x, y) => {
    const outside = isClear(before, x, y) && SIDES.some(([dx, dy]) => !isClear(before, x + dx, y + dy));

    return outside ? colour : undefined;
  });
}

// The outer half of a two-pixel outline: an outline pixel with background on one side, outline
// then fill straight behind it, and outline on both sides along the edge. A corner of a stepped
// outline or the tip of a hair spike has no outline beside it on both sides, so it stays.
export function thinOutline(sprite, colour) {
  return eachPixel(sprite, (before, x, y) => {
    if (getPixel(before, x, y) !== colour) {
      return undefined;
    }

    const doubled = SIDES.some(([dx, dy]) => {
      const behind = getPixel(before, x - 2 * dx, y - 2 * dy);
      const along = [getPixel(before, x + dy, y + dx), getPixel(before, x - dy, y - dx)];

      return (
        isClear(before, x + dx, y + dy) &&
        getPixel(before, x - dx, y - dy) === colour &&
        behind !== CLEAR &&
        behind !== colour &&
        along.every((c) => c === colour)
      );
    });

    return doubled ? CLEAR : undefined;
  });
}

// An edge pixel that is not outline, with outline on two or more edge pixels around it, is a gap
// in the outline: it takes the outline colour.
export function closeGaps(sprite, colour) {
  return eachPixel(sprite, (before, x, y) => {
    const color = getPixel(before, x, y);

    if (color === CLEAR || color === colour || !touchesClear(before, x, y)) {
      return undefined;
    }

    const outlined = AROUND.filter(([dx, dy]) => getPixel(before, x + dx, y + dy) === colour && touchesClear(before, x + dx, y + dy));

    return outlined.length >= 2 ? colour : undefined;
  });
}

// what an operation would do, without doing it: how many pixels and which
export function previewOutline(sprite, operation, colour) {
  const copy = cloneSprite(sprite);
  const count = operation(copy, colour);
  const points = [];

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (getPixel(copy, x, y) !== getPixel(sprite, x, y)) {
        points.push([x, y]);
      }
    }
  }

  return { sprite: copy, count, points };
}

