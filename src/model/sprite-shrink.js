// A sprite made `step` times smaller, each pixel standing for a square of the art: it takes
// the first painted pixel of its square, so a line one pixel thick is still a line. Drawn under
// 100% by leaving pixels out, three strokes in four on the largest canvas were not to be seen.
// `into` is a sprite of the smaller size to fill, kept by the caller from one drawing to the next.
export function shrinkInto(sprite, step, into) {
  const from = new Uint32Array(
    sprite.pixels.buffer,
    sprite.pixels.byteOffset,
    sprite.pixels.length / 4,
  );
  const to = new Uint32Array(into.pixels.buffer, into.pixels.byteOffset, into.pixels.length / 4);

  for (let y = 0; y < into.height; y++) {
    for (let x = 0; x < into.width; x++) {
      to[y * into.width + x] = firstPainted(from, sprite, { x: x * step, y: y * step, step });
    }
  }

  return into;
}

function firstPainted(words, { width, height }, { x, y, step }) {
  const right = Math.min(width, x + step);
  const bottom = Math.min(height, y + step);

  for (let row = y; row < bottom; row++) {
    for (let column = x; column < right; column++) {
      const word = words[row * width + column];

      if (word) {
        return word;
      }
    }
  }

  return 0;
}

export const shrunkSize = (sprite, step) => ({
  width: Math.ceil(sprite.width / step),
  height: Math.ceil(sprite.height / step),
});
