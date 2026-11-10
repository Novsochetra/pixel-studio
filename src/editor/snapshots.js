import { cloneSprite } from '../model/sprite.js';

function snapshotFrame(frame) {
  return {
    ...frame,
    marks: frame.marks?.map((mark) => ({ ...mark })),
    layers: frame.layers.map((layer) => ({
      ...layer,
      sprite: layer.sprite && cloneSprite(layer.sprite),
    })),
  };
}

// A copy of every animation, pixels included, so a frame, layer or animation change can be undone.
export function snapshotAnimations(animations) {
  return animations.map((animation) => ({
    ...animation,
    directions: Object.fromEntries(
      Object.entries(animation.directions).map(([direction, entry]) => [
        direction,
        { ...entry, frames: entry.frames.map(snapshotFrame) },
      ]),
    ),
  }));
}

function layerPixels(animations) {
  const frames = animations.flatMap((animation) =>
    Object.values(animation.directions).flatMap((entry) => entry.frames),
  );

  return new Map(
    frames.flatMap((frame) => frame.layers.map((layer) => [layer.id, layer.sprite?.pixels])),
  );
}

// ids of layers whose pixels differ between two sets of animations, or that only one has
export function changedLayers(before, after) {
  const first = layerPixels(before);
  const second = layerPixels(after);
  const ids = [];

  for (const [id, pixels] of second) {
    const old = first.get(id);

    if (
      !old ||
      !pixels ||
      old.length !== pixels.length ||
      old.some((value, i) => value !== pixels[i])
    ) {
      ids.push(id);
    }
  }

  return ids;
}

// everything but the pixels, as text: names, order, poses, pins, cuts, what is hidden
const shapeOf = (animations) =>
  JSON.stringify(animations, (key, value) => (key === 'sprite' ? undefined : value));

export function sameAnimations(before, after) {
  return (
    shapeOf(before) === shapeOf(after) &&
    !changedLayers(before, after).length &&
    !changedLayers(after, before).length
  );
}
