import { bounds, createSprite, cropped } from './sprite.js';
import { compositeFrame } from './composite.js';
import { referenceOf } from './reference.js';
import { newId } from './project.js';

const withoutPixels = (project) =>
  JSON.parse(JSON.stringify(project, (key, value) => (key === 'sprite' ? undefined : value)));

// pictures to trace and pins belong to the art they were placed over
function blankFrame(frame, canvas) {
  const art = frame.layers.filter((layer) => layer.kind !== 'reference');

  delete frame.marks;
  frame.layers = (art.length ? art : frame.layers).map((layer) => ({
    ...layer,
    sprite: createSprite(canvas.width, canvas.height),
  }));
}

// outfits and colour swaps are made from the other character's colours, so they stay with it
export function blankCopy(project, name) {
  const copy = withoutPixels(project);

  for (const animation of copy.animations) {
    for (const entry of Object.values(animation.directions)) {
      entry.frames.forEach((frame) => blankFrame(frame, copy.canvas));
    }
  }

  return { ...copy, id: newId('p'), name, outfits: [], mappings: {} };
}

export function portraitFrame(project) {
  const direction = referenceOf(project);
  const animation = project.animations.find((candidate) => candidate.directions[direction]);

  return animation?.directions[direction].frames[0] ?? null;
}

export function portraitOf(project) {
  const frame = portraitFrame(project);

  if (!frame) {
    return null;
  }

  const sprite = compositeFrame(frame, project.canvas.width, project.canvas.height);
  const box = bounds(sprite);

  return box ? cropped(sprite, box) : null;
}

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

// whole numbers only: any other scale draws the art's pixels at uneven sizes
export function lineUpScale(sprites, room, most = 6) {
  const tallest = Math.max(1, ...sprites.map((sprite) => sprite.height));

  return Math.max(1, Math.min(most, Math.floor(room / tallest)));
}
