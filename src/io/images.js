import { createSprite } from '../model/sprite.js';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  return canvas;
}

// a file or blob as raw RGBA, colours exactly as stored (no colour-profile conversion)
export async function decodeImage(blob) {
  const bitmap = await createImageBitmap(blob, {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  });
  const { width, height } = bitmap;
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, width, height);
  bitmap.close?.();

  return { width, height, data };
}

export async function decodeSprite(blob) {
  const { width, height, data } = await decodeImage(blob);
  const sprite = createSprite(width, height);
  sprite.pixels.set(data);

  return sprite;
}

// The sprite drawn `scale` times bigger with hard pixel edges, over an optional background
// painter (a checkerboard, a pitch).
export function spriteCanvas(sprite, scale = 1, paintBackground = null) {
  const canvas = makeCanvas(sprite.width * scale, sprite.height * scale);
  const context = canvas.getContext('2d');
  const native = makeCanvas(sprite.width, sprite.height);
  native
    .getContext('2d')
    .putImageData(
      new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height),
      0,
      0,
    );
  paintBackground?.(context, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(native, 0, 0, canvas.width, canvas.height);

  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded.'))),
      'image/png',
    );
  });
}

export function spritePng(sprite, scale = 1, paintBackground = null) {
  return canvasToBlob(spriteCanvas(sprite, scale, paintBackground));
}

export function spriteDataUrl(sprite) {
  return spriteCanvas(sprite).toDataURL('image/png');
}

// through an <img>, since the page may not fetch data: addresses
export async function dataUrlSprite(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = makeCanvas(image.naturalWidth, image.naturalHeight);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const sprite = createSprite(canvas.width, canvas.height);
  sprite.pixels.set(context.getImageData(0, 0, canvas.width, canvas.height).data);

  return sprite;
}

// the green and white checkerboard of the original front image: squares of 2x2 art pixels
export function checkerPainter(squarePx, colors = ['#00ff00', '#ffffff']) {
  return (context, width, height) => {
    for (let y = 0; y < height; y += squarePx) {
      for (let x = 0; x < width; x += squarePx) {
        context.fillStyle = colors[(x / squarePx + y / squarePx) % 2];
        context.fillRect(x, y, squarePx, squarePx);
      }
    }
  };
}
