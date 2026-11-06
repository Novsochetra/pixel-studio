import { compositeFrame } from '../model/composite.js';
import { flipHorizontal } from '../model/sprite.js';
import { mirrorsOf } from '../model/directions.js';

export const PLAIN_SIZE = { width: 768, height: 432 };

const nativeOf = (sprite) => {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  canvas
    .getContext('2d')
    .putImageData(
      new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height),
      0,
      0,
    );

  return canvas;
};

// the whole frame drawn so the character's feet (the anchor) stand on (x, groundY), scaled by
// factor
export function drawStanding(context, sprite, { x, groundY, anchor, factor }) {
  context.imageSmoothingEnabled = false;
  context.drawImage(
    nativeOf(sprite),
    Math.round(x - anchor.x * factor),
    Math.round(groundY - anchor.y * factor),
    Math.round(sprite.width * factor),
    Math.round(sprite.height * factor),
  );
}

// what stands in the preview: each drawn direction, then the mirrored ones if asked
export function cast(project, animation, showMirrored) {
  const drawn = Object.keys(animation.directions).map((direction) => ({
    direction,
    source: direction,
    flip: false,
  }));
  const mirrored = Object.entries(mirrorsOf(project))
    .filter(
      ([direction, source]) => animation.directions[source] && !animation.directions[direction],
    )
    .map(([direction, source]) => ({ direction, source, flip: true }));

  return showMirrored ? [...drawn, ...mirrored] : drawn;
}

export function frameSprite(project, animation, member, tick) {
  const frames = animation.directions[member.source].frames;
  const sprite = compositeFrame(
    frames[tick % frames.length],
    project.canvas.width,
    project.canvas.height,
  );

  return member.flip ? flipHorizontal(sprite) : sprite;
}

// a quiet floor and ground line, for projects with no background of their own
export function drawPlainGround(context, { width, height, groundY }, colours) {
  context.fillStyle = colours.sky;
  context.fillRect(0, 0, width, height);
  context.fillStyle = colours.ground;
  context.fillRect(0, groundY + 1, width, height - groundY - 1);
}

// the members side by side, centred, each a character's width apart
export function standingSpots(count, width, spacing) {
  const first = width / 2 - ((count - 1) * spacing) / 2;

  return Array.from({ length: count }, (_, i) => Math.round(first + i * spacing));
}
