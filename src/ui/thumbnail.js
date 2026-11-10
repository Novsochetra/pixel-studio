import { bounds } from '../model/sprite.js';
import { shrunk } from '../model/shrink.js';

function nativeCanvas(sprite) {
  const native = document.createElement('canvas');

  native.width = sprite.width;
  native.height = sprite.height;
  const pixels = new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height);
  native.getContext('2d').putImageData(pixels, 0, 0);

  return native;
}

// What is drawn for the art inside `box` at `scale`: art larger than the picture is shrunk by
// hand, which keeps its thin lines; smaller art is drawn larger, pixel for pixel.
function artAt(sprite, box, scale) {
  if (scale >= 1) {
    const [wide, tall] = [box.right - box.left, box.bottom - box.top];

    return { art: sprite, from: box, wide, tall, across: wide * scale, down: tall * scale };
  }

  const art = shrunk(sprite, box, scale);
  const from = { left: 0, top: 0 };

  return { art, from, wide: art.width, tall: art.height, across: art.width, down: art.height };
}

export function drawThumbnail(
  canvas,
  sprite,
  size = 104,
  { box: frameBox = null, flip = false } = {},
) {
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const box = sprite && (frameBox ?? bounds(sprite));

  if (!box) {
    return;
  }

  const scale = size / Math.max(box.right - box.left, box.bottom - box.top);
  const { art, from, wide, tall, across, down } = artAt(sprite, box, scale);

  context.imageSmoothingEnabled = false;

  if (flip) {
    context.translate(size, 0);
    context.scale(-1, 1);
  }

  context.drawImage(
    nativeCanvas(art),
    from.left,
    from.top,
    wide,
    tall,
    Math.round((size - across) / 2),
    Math.round((size - down) / 2),
    across,
    down,
  );
}
