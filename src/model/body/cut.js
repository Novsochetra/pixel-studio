import { CLEAR, createSprite, getPixel, setPixel } from '../sprite.js';
import { encodeArt } from './piece-art.js';
import { defaultPivot } from './pivots.js';

// Cutting a view: `owners` says, for each canvas pixel, which part (its index) takes it, or -1 for
// none. A part that moves shows what was under it, so where two linked parts meet, the one drawn
// below reaches a few pixels in under the one above, in its own edge's colours.

export const REACH_UNDER = 3;

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function partSprite(source, owners, index) {
  const out = createSprite(source.width, source.height);

  owners.forEach((owner, i) => {
    if (owner === index) {
      const [x, y] = [i % source.width, Math.floor(i / source.width)];

      setPixel(out, x, y, getPixel(source, x, y));
    }
  });

  return out;
}

// read as a pixel's alpha, as the parts are cut once for each pair that meets: a colour made of
// every pixel of the canvas each time was most of a cut's time
const opaque = (sprite, i) => sprite.pixels[i * 4 + 3] !== 0;

// the lower part grows, a ring at a time, into the upper part's pixels
function reachUnder(lower, owners, upperIndex) {
  const outline = darkestColour(lower);
  let ring = [];

  owners.forEach((owner, i) => {
    if (owner !== upperIndex && opaque(lower, i)) {
      ring.push(i);
    }
  });

  for (let step = 0; step < REACH_UNDER && ring.length; step++) {
    ring = ring.flatMap((i) => growFrom(lower, owners, { i, upperIndex, outline }));
  }
}

const NEAR = 3;

// the colour most of the part has around (x, y), its outline left out: grown on, an edge's own
// colours would draw streaks
function mainColourNear(sprite, [x, y], outline) {
  const counts = new Map([[getPixel(sprite, x, y), 0]]);

  for (let dy = -NEAR; dy <= NEAR; dy++) {
    for (let dx = -NEAR; dx <= NEAR; dx++) {
      const colour = getPixel(sprite, x + dx, y + dy);

      if (colour !== CLEAR && colour !== outline) {
        counts.set(colour, (counts.get(colour) ?? 0) + 1);
      }
    }
  }

  return [...counts].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

const lightness = (colour) => (colour >>> 24) + ((colour >>> 16) & 255) + ((colour >>> 8) & 255);

// pixel art outlines in its darkest colour
function darkestColour(sprite) {
  let darkest = CLEAR;

  for (let i = 0; i < sprite.width * sprite.height; i++) {
    const colour = opaque(sprite, i)
      ? getPixel(sprite, i % sprite.width, Math.floor(i / sprite.width))
      : CLEAR;

    if (colour !== CLEAR && (darkest === CLEAR || lightness(colour) < lightness(darkest))) {
      darkest = colour;
    }
  }

  return darkest;
}

// The colour is reckoned only where there is somewhere to grow: reckoned for every pixel of the
// part, a cut took half a second on a slow phone.
function growFrom(lower, owners, { i, upperIndex, outline }) {
  const { width, height } = lower;
  const [x, y] = [i % width, Math.floor(i / width)];
  const targets = NEIGHBOURS.map(([dx, dy]) => [x + dx, y + dy])
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < width && ny < height)
    .filter(([nx, ny]) => owners[ny * width + nx] === upperIndex && !getPixel(lower, nx, ny));

  if (!targets.length) {
    return [];
  }

  const colour = mainColourNear(lower, [x, y], outline);

  return targets.map(([nx, ny]) => {
    setPixel(lower, nx, ny, colour);

    return ny * width + nx;
  });
}

function linkedPairs(parts) {
  const indexOf = new Map(parts.map((part, index) => [part.id, index]));

  return parts
    .map((part, index) => [indexOf.get(part.parent), index])
    .filter(([parent]) => parent !== undefined)
    .map(([parent, child]) => [Math.min(parent, child), Math.max(parent, child)]);
}

function cropped(sprite) {
  let box = null;

  for (let i = 3; i < sprite.pixels.length; i += 4) {
    if (sprite.pixels[i]) {
      const [x, y] = [((i - 3) / 4) % sprite.width, Math.floor((i - 3) / 4 / sprite.width)];

      box = box
        ? { left: Math.min(box.left, x), top: box.top, right: Math.max(box.right, x), bottom: y }
        : { left: x, top: y, right: x, bottom: y };
    }
  }

  return box;
}

function encodePart(sprite) {
  const box = cropped(sprite);

  if (!box) {
    return null;
  }

  const out = createSprite(box.right - box.left + 1, box.bottom - box.top + 1);

  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      setPixel(out, x, y, getPixel(sprite, box.left + x, box.top + y));
    }
  }

  return encodeArt(out, { x: box.left, y: box.top });
}

// parts: [{ id, name, parent, pivot? }] bottom first; returns the rig, without parts left empty
export function cutIntoParts(source, owners, parts) {
  const sprites = parts.map((_, index) => partSprite(source, owners, index));

  for (const [lower, upper] of linkedPairs(parts)) {
    reachUnder(sprites[lower], owners, upper);
  }

  const indexOf = new Map(parts.map((part, index) => [part.id, index]));
  const pieces = parts
    .map((part, index) => ({
      ...part,
      pivot:
        part.pivot ??
        defaultPivot(owners, source, { index, parentIndex: indexOf.get(part.parent) }),
      art: encodePart(sprites[index]),
    }))
    .filter((piece) => piece.art);

  return { pieces };
}

// the pixels no part took: they stay on the layer that was cut
export function leftOver(source, owners) {
  return partSprite(source, owners, -1);
}
