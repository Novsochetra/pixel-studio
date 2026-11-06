import { bounds, createSprite } from './sprite.js';
import { compositeFrame } from './composite.js';
import { referenceOf } from './reference.js';
import { newId } from './project.js';

const withoutPixels = (project) =>
  JSON.parse(JSON.stringify(project, (key, value) => (key === 'sprite' ? undefined : value)));

// Pictures to trace and pins belong to the art they were placed over, so a blank frame keeps
// only its art layers (all of them, if it had nothing else), each with nothing drawn.
function blankFrame(frame, canvas) {
  const art = frame.layers.filter((layer) => layer.kind !== 'reference');

  delete frame.marks;
  frame.layers = (art.length ? art : frame.layers).map((layer) => ({
    ...layer,
    sprite: createSprite(canvas.width, canvas.height),
  }));
}

// A new project set up as `project` is: its kind, canvas, views, guides, parts, palettes and
// every animation with its frames and layers, with nothing drawn. A game's characters share one
// setup, so each is drawn over the same frames. Outfits and colour swaps are made from the
// other's colours and stay with it.
export function blankCopy(project, name) {
  const copy = withoutPixels(project);

  for (const animation of copy.animations) {
    for (const entry of Object.values(animation.directions)) {
      entry.frames.forEach((frame) => blankFrame(frame, copy.canvas));
    }
  }

  return { ...copy, id: newId('p'), name, outfits: [], mappings: {} };
}

function cropped(sprite, box) {
  const out = createSprite(box.right - box.left, box.bottom - box.top);

  for (let y = 0; y < out.height; y++) {
    const from = ((box.top + y) * sprite.width + box.left) * 4;

    out.pixels.set(sprite.pixels.subarray(from, from + out.width * 4), y * out.width * 4);
  }

  return out;
}

// the frame that pictures the project: the first of its reference view
export function portraitFrame(project) {
  const direction = referenceOf(project);
  const animation = project.animations.find((candidate) => candidate.directions[direction]);

  return animation?.directions[direction].frames[0] ?? null;
}

// The project as one picture: its portrait frame as it ships, cut to its art. Null while nothing
// is drawn there.
export function portraitOf(project) {
  const frame = portraitFrame(project);

  if (!frame) {
    return null;
  }

  const sprite = compositeFrame(frame, project.canvas.width, project.canvas.height);
  const box = bounds(sprite);

  return box ? cropped(sprite, box) : null;
}

// Pictures side by side, `gap` pixels apart, standing on one line: the bottom of each is the
// bottom of the whole.
export function lineUp(sprites, gap) {
  const width = sprites.reduce((sum, sprite) => sum + sprite.width, 0);
  const height = Math.max(0, ...sprites.map((sprite) => sprite.height));
  const out = createSprite(width + gap * Math.max(0, sprites.length - 1), height);
  let left = 0;

  for (const sprite of sprites) {
    const top = height - sprite.height;

    for (let y = 0; y < sprite.height; y++) {
      const row = sprite.pixels.subarray(y * sprite.width * 4, (y + 1) * sprite.width * 4);

      out.pixels.set(row, ((top + y) * out.width + left) * 4);
    }

    left += sprite.width + gap;
  }

  return out;
}

// the biggest whole-number scale (up to `most`) at which the tallest picture fits `room` pixels
export function lineUpScale(sprites, room, most = 6) {
  const tallest = Math.max(1, ...sprites.map((sprite) => sprite.height));

  return Math.max(1, Math.min(most, Math.floor(room / tallest)));
}
