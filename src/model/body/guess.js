import { CLEAR, bounds, getPixel } from '../sprite.js';

// A first guess at the cut of a figure standing up and facing out, from its proportions: head,
// torso, hips, then thighs, shins and feet down to the ground, and the arms beside the body.
// The cut sheet shows it to be corrected with the brush.

const BANDS = [
  [0.31, 'head'],
  [0.565, 'torso'],
  [0.685, 'hips'],
  [0.78, 'thigh'],
  [0.895, 'shin'],
  [1, 'foot'],
];

const opaque = (sprite, x, y) => getPixel(sprite, x, y) !== CLEAR;

function middleOf(sprite, box) {
  let sum = 0;
  let count = 0;

  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) {
      if (opaque(sprite, x, y)) {
        sum += x;
        count += 1;
      }
    }
  }

  return sum / count;
}

// the body's own width at the hips: the run of pixels through the middle, arms left out
function bodyColumn(sprite, box, middle) {
  const y = box.top + Math.round((box.bottom - box.top) * 0.62);
  let left = Math.round(middle);
  let right = left;

  while (left > box.left && opaque(sprite, left - 1, y)) {
    left -= 1;
  }

  while (right < box.right - 1 && opaque(sprite, right + 1, y)) {
    right += 1;
  }

  return { left, right };
}

function roleAt(figure, [x, y]) {
  const { box, middle, column } = figure;
  const height = box.bottom - box.top;
  const along = (y - box.top + 0.5) / height;
  const side = x < middle ? 'l' : 'r';
  const band = BANDS.find(([end]) => along < end)[1];
  const besideBody = x < column.left || x > column.right;

  if (besideBody && (band === 'torso' || band === 'hips')) {
    return `${along < 0.5 ? 'upper' : 'lower'}-arm-${side}`;
  }

  return ['head', 'torso', 'hips'].includes(band) ? band : `${band}-${side}`;
}

// owners for cutIntoParts: each opaque pixel's place in `parts`, by the part's id
export function guessOwners(sprite, parts) {
  const owners = new Int16Array(sprite.width * sprite.height).fill(-1);
  const box = bounds(sprite);

  if (!box) {
    return owners;
  }

  const middle = middleOf(sprite, box);
  const figure = { box, middle, column: bodyColumn(sprite, box, middle) };
  const indexOf = new Map(parts.map((part, index) => [part.id, index]));

  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) {
      if (opaque(sprite, x, y)) {
        owners[y * sprite.width + x] = indexOf.get(roleAt(figure, [x, y])) ?? -1;
      }
    }
  }

  return owners;
}
