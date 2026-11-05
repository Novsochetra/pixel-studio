import { roundHalfEven } from './numeric.js';

// [left, top, right, bottom) of the opaque cells, or null when there are none
export function bbox(opaque, width) {
  let left = Infinity;
  let top = Infinity;
  let right = -1;
  let bottom = -1;

  opaque.forEach((on, i) => {
    if (on) {
      const x = i % width;
      const y = (i - x) / width;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  });

  return right < 0 ? null : { left, top, right: right + 1, bottom: bottom + 1 };
}

// mean column of the legs (lowest quarter): the body's axis, which hair or an arm sticking out to
// one side does not move
export function bodyColumn(opaque, width) {
  const { top, bottom } = bbox(opaque, width);
  const from = bottom - Math.max(1, Math.floor((bottom - top) / 4));
  let total = 0;
  let count = 0;

  for (let y = from; y < bottom; y++) {
    for (let x = 0; x < width; x++) {
      if (opaque[y * width + x]) {
        total += x;
        count++;
      }
    }
  }

  return total / count;
}

// the sprite on the reference canvas: feet on the reference's bottom row, legs on its column
export function placeLike(sprite, ref) {
  const { width, height } = ref;
  const spriteBox = bbox(sprite.opaque, sprite.width);
  const refBox = bbox(ref.opaque, ref.width);
  const dx = roundHalfEven(bodyColumn(ref.opaque, ref.width) - bodyColumn(sprite.opaque, sprite.width));
  const dy = refBox.bottom - spriteBox.bottom;
  const colors = new Uint8Array(width * height * 3);
  const opaque = new Uint8Array(width * height);

  sprite.opaque.forEach((on, i) => {
    const x = (i % sprite.width) + dx;
    const y = Math.floor(i / sprite.width) + dy;

    if (on && x >= 0 && y >= 0 && x < width && y < height) {
      colors.set(sprite.colors.subarray(i * 3, i * 3 + 3), (y * width + x) * 3);
      opaque[y * width + x] = 1;
    }
  });

  return { width, height, colors, opaque };
}
