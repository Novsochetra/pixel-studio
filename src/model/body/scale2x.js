import { createSprite, getPixel, setPixel } from '../sprite.js';

// Scale2x: each pixel becomes four, its corners taking a neighbour's colour where two neighbours
// meet, so diagonal lines stay lines. Three passes make RotSprite's eight-times picture, which a
// turn samples from so turned pixel art keeps its shapes instead of breaking up.
function corners(sprite, x, y) {
  const at = (dx, dy) => getPixel(sprite, x + dx, y + dy);
  const [centre, up, left, right, down] = [at(0, 0), at(0, -1), at(-1, 0), at(1, 0), at(0, 1)];

  if (up === down || left === right) {
    return [centre, centre, centre, centre];
  }

  return [
    left === up ? left : centre,
    up === right ? right : centre,
    left === down ? left : centre,
    down === right ? right : centre,
  ];
}

export function scale2x(sprite) {
  const out = createSprite(sprite.width * 2, sprite.height * 2);

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const [topLeft, topRight, bottomLeft, bottomRight] = corners(sprite, x, y);

      setPixel(out, x * 2, y * 2, topLeft);
      setPixel(out, x * 2 + 1, y * 2, topRight);
      setPixel(out, x * 2, y * 2 + 1, bottomLeft);
      setPixel(out, x * 2 + 1, y * 2 + 1, bottomRight);
    }
  }

  return out;
}

export const SMOOTH_SCALE = 8;

const smoothed = new WeakMap();

export function scale8(sprite) {
  if (!smoothed.has(sprite)) {
    smoothed.set(sprite, scale2x(scale2x(scale2x(sprite))));
  }

  return smoothed.get(sprite);
}
