import { CLEAR, createSprite, getPixel, setPixel } from './sprite.js';

// The part of a sprite inside `box`, drawn `scale` times its size (under 1): each pixel of the
// small picture takes a colour from the art it covers if there is any there. Taking one pixel in
// so many, a line one pixel thin fell between the ones taken and the picture came out empty.
export function shrunk(sprite, box, scale) {
  const small = createSprite(
    Math.max(1, Math.round((box.right - box.left) * scale)),
    Math.max(1, Math.round((box.bottom - box.top) * scale)),
  );

  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) {
      const color = getPixel(sprite, x, y);

      if (color !== CLEAR) {
        setPixel(
          small,
          Math.min(small.width - 1, Math.floor((x - box.left) * scale)),
          Math.min(small.height - 1, Math.floor((y - box.top) * scale)),
          color,
        );
      }
    }
  }

  return small;
}
