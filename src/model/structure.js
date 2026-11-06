import { cloneSprite, createSprite } from './sprite.js';
import { newAnimation, newFrame, newId, newLayer } from './project.js';

const framesOf = (animation) =>
  Object.values(animation.directions).flatMap((entry) => entry.frames);

// the layer list every frame of an animation shares: [{ key, name, kind, visible, opacity }]
export function layerStack(animation) {
  const first = framesOf(animation)[0];

  return first
    ? first.layers.map(({ key, name, kind, visible, opacity }) => ({
        key,
        name,
        kind,
        visible,
        opacity,
      }))
    : [];
}

// a frame shaped like the animation's others: same layers, all empty, or copies of `source`
export function frameLike(animation, canvas, source = null) {
  const stack = layerStack(animation);
  const layers = stack.map((entry) => {
    const copy = source?.layers.find((layer) => layer.key === entry.key)?.sprite;

    return {
      ...newLayer(
        canvas.width,
        canvas.height,
        entry.name,
        copy ? cloneSprite(copy) : createSprite(canvas.width, canvas.height),
        entry.key,
        entry.kind,
      ),
      visible: entry.visible,
      opacity: entry.opacity,
    };
  });

  return newFrame(canvas.width, canvas.height, layers);
}

// a new view has as many frames as the others, since every frame is a moment of all of them
export function addDirection(project, animation, direction, copyFrom = null) {
  const source = copyFrom ? animation.directions[copyFrom]?.frames : null;
  const count = Math.max(
    1,
    ...Object.values(animation.directions).map((entry) => entry.frames.length),
  );
  animation.directions[direction] = {
    frames: source
      ? source.map((frame) => frameLike(animation, project.canvas, frame))
      : Array.from({ length: count }, () => frameLike(animation, project.canvas)),
  };
}

export function removeDirection(animation, direction) {
  if (Object.keys(animation.directions).length > 1) {
    delete animation.directions[direction];
  }
}

// a new layer in every frame of the animation, placed above `aboveKey` (or on top)
export function addLayer(project, animation, name, kind = 'art', aboveKey = null) {
  const key = newId('k');

  for (const frame of framesOf(animation)) {
    const at = aboveKey
      ? frame.layers.findIndex((layer) => layer.key === aboveKey) + 1
      : frame.layers.length;
    frame.layers.splice(
      at,
      0,
      newLayer(project.canvas.width, project.canvas.height, name, undefined, key, kind),
    );
  }

  return key;
}

export function updateLayer(animation, key, patch) {
  for (const frame of framesOf(animation)) {
    const layer = frame.layers.find((other) => other.key === key);

    if (layer) {
      Object.assign(layer, patch);
    }
  }
}

export function removeLayer(animation, key) {
  if (
    layerStack(animation).filter((entry) => entry.kind === 'art').length <= 1 &&
    layerStack(animation).find((entry) => entry.key === key)?.kind === 'art'
  ) {
    return false;
  }

  for (const frame of framesOf(animation)) {
    frame.layers = frame.layers.filter((layer) => layer.key !== key);
  }

  return true;
}

export function moveLayer(animation, key, step) {
  for (const frame of framesOf(animation)) {
    const index = frame.layers.findIndex((layer) => layer.key === key);
    const to = index + step;

    if (index >= 0 && to >= 0 && to < frame.layers.length) {
      [frame.layers[index], frame.layers[to]] = [frame.layers[to], frame.layers[index]];
    }
  }
}

export function addAnimation(project, name, directions) {
  const animation = newAnimation(name, project.canvas, directions);
  project.animations.push(animation);

  return animation;
}

export function removeAnimation(project, id) {
  if (project.animations.length > 1) {
    project.animations = project.animations.filter((animation) => animation.id !== id);
  }
}

// the current frame of one view becomes the same frame of every other view: a start for them
export function copyFrameToViews(project, animation, direction, index) {
  const source = animation.directions[direction].frames[index];

  for (const [other, entry] of Object.entries(animation.directions)) {
    if (other === direction) {
      continue;
    }

    for (const layer of entry.frames[index].layers) {
      const copy = source.layers.find((candidate) => candidate.key === layer.key)?.sprite;
      layer.sprite = copy
        ? cloneSprite(copy)
        : createSprite(project.canvas.width, project.canvas.height);
    }
  }
}
