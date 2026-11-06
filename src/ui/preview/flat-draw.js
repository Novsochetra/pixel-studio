import { cssVar } from '../draw.js';
import { compositeFrame } from '../../model/composite.js';

function nativeOf(sprite) {
  const canvas = document.createElement('canvas');

  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const pixels = new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height);
  canvas.getContext('2d').putImageData(pixels, 0, 0);

  return canvas;
}

function frameAtTick(project, frames, tick) {
  return compositeFrame(frames[tick % frames.length], project.canvas.width, project.canvas.height);
}

const ACROSS = 8;
const DOWN = 5;

// The tile laid edge to edge as a floor, so a seam shows wherever its sides do not meet.
export function drawTiles(canvas, project, { frames, tick }) {
  const { width, height } = project.canvas;

  canvas.width = width * ACROSS;
  canvas.height = height * DOWN;
  const context = canvas.getContext('2d');
  const tile = nativeOf(frameAtTick(project, frames, tick));

  for (let row = 0; row < DOWN; row++) {
    for (let column = 0; column < ACROSS; column++) {
      context.drawImage(tile, column * width, row * height);
    }
  }

  return { width: canvas.width, height: canvas.height };
}

const SIZES = [1, 2, 4];
const GAP = 16;

function plate(context, { art, left, top, background }) {
  const side = art.width * 4 + GAP * 2;

  context.fillStyle = background;
  context.fillRect(left, top, side * SIZES.length, art.height * 4 + GAP * 2);
  let x = left + GAP;

  for (const size of SIZES) {
    context.drawImage(
      art,
      x,
      top + GAP + (art.height * 4 - art.height * size) / 2,
      art.width * size,
      art.height * size,
    );
    x += side;
  }
}

// The art at one, two and four times its size, on a light and on a dark backdrop, as it will sit in
// a menu or over the game.
export function drawCentred(canvas, project, { frames, tick }) {
  const art = nativeOf(frameAtTick(project, frames, tick));
  const side = art.width * 4 + GAP * 2;

  canvas.width = side * SIZES.length;
  canvas.height = (art.height * 4 + GAP * 2) * 2;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  plate(context, { art, left: 0, top: 0, background: cssVar('--chrome-raised') });
  plate(context, { art, left: 0, top: canvas.height / 2, background: cssVar('--ink') });

  return { width: canvas.width, height: canvas.height };
}
