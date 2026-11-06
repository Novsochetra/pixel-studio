import { bounds } from '../model/sprite.js';

function nativeCanvas(sprite) {
  const native = document.createElement('canvas');
  native.width = sprite.width;
  native.height = sprite.height;
  const pixels = new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height);
  native.getContext('2d').putImageData(pixels, 0, 0);

  return native;
}

// The sprite's art (or the part of it inside `frameBox`, so a row of frames shares one framing)
// scaled to fit a size×size canvas, pixels kept sharp; flipped when asked.
export function drawThumbnail(canvas, sprite, size = 104, { box: frameBox = null, flip = false } = {}) {
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const box = sprite && (frameBox ?? bounds(sprite));

  if (!box) {
    return;
  }

  const wide = box.right - box.left;
  const tall = box.bottom - box.top;
  const scale = size / Math.max(wide, tall);
  context.imageSmoothingEnabled = false;

  if (flip) {
    context.translate(size, 0);
    context.scale(-1, 1);
  }

  const left = (size - wide * scale) / 2;
  const top = (size - tall * scale) / 2;
  context.drawImage(nativeCanvas(sprite), box.left, box.top, wide, tall, left, top, wide * scale, tall * scale);
}
