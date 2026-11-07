import { cloneSprite, createSprite } from './sprite.js';
import { newAnimation, newFrame, newId, newLayer } from './project.js';
import { BODY_KIND } from './body/body-kind.js';

export const framesOf = (animation) =>
  Object.values(animation.directions).flatMap((entry) => entry.frames);

export function layerStack(animation) {
  const first = framesOf(animation)[0];

  return first
    ? first.layers.map(({ key, name, kind, opacity }) => ({ key, name, kind, opacity }))
    : [];
}

// a frame shaped like the animation's others: same layers, all empty, or copies of `source`
export function frameLike(animation, canvas, source = null) {
  const stack = layerStack(animation);
  const layers = stack.map((entry) => {
    const from = source?.layers.find((layer) => layer.key === entry.key);

    return {
      ...newLayer(canvas.width, canvas.height, {
        name: entry.name,
        sprite: from?.sprite ? cloneSprite(from.sprite) : createSprite(canvas.width, canvas.height),
        key: entry.key,
        kind: entry.kind,
      }),
      visible: from?.visible ?? true,
      opacity: entry.opacity,
      ...(from?.pose ? { pose: from.pose } : {}),
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

  const rig = copyFrom ? animation.directions[copyFrom]?.rig : null;

  animation.directions[direction] = {
    frames: source
      ? source.map((frame) => frameLike(animation, project.canvas, frame))
      : Array.from({ length: count }, () => frameLike(animation, project.canvas)),
    ...(rig ? { rig } : {}),
  };
}

export function removeDirection(animation, direction) {
  if (Object.keys(animation.directions).length > 1) {
    delete animation.directions[direction];
  }
}

export function addLayer(project, animation, { name, kind = 'art', above = null }) {
  const key = newId('k');

  for (const frame of framesOf(animation)) {
    const at = above
      ? frame.layers.findIndex((layer) => layer.key === above) + 1
      : frame.layers.length;
    frame.layers.splice(
      at,
      0,
      newLayer(project.canvas.width, project.canvas.height, { name, key, kind }),
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

// a layer's name and place are the animation's; whether it shows is each frame's own
export function setLayerShown(frame, key, visible) {
  const layer = frame.layers.find((other) => other.key === key);

  if (layer) {
    layer.visible = visible;
  }
}

export function removeLayer(animation, key) {
  if (
    layerStack(animation).filter((entry) => entry.kind === 'art').length <= 1 &&
    layerStack(animation).find((entry) => entry.key === key)?.kind === 'art'
  ) {
    return false;
  }

  const body = layerStack(animation).find((entry) => entry.key === key)?.kind === BODY_KIND;

  for (const frame of framesOf(animation)) {
    frame.layers = frame.layers.filter((layer) => layer.key !== key);
  }

  if (body) {
    forgetCuts(animation);
  }

  return true;
}

// once the Body layer is gone, the cuts it was drawn from go too
export function forgetCuts(animation) {
  for (const entry of Object.values(animation.directions)) {
    delete entry.rig;
  }
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

// a name no other animation of the project has: "Run", then "Run 2", "Run 3"
export function uniqueName(project, name, except = null) {
  const taken = new Set(
    project.animations
      .filter((animation) => animation !== except)
      .map((animation) => animation.name),
  );
  let candidate = name;

  for (let count = 2; taken.has(candidate); count++) {
    candidate = `${name} ${count}`;
  }

  return candidate;
}

export function addAnimation(project, name, directions) {
  const animation = newAnimation(uniqueName(project, name), project.canvas, directions);

  project.animations.push(animation);

  return animation;
}

// Takes the animation out, unless it is the last, and returns the one to open in its place: the
// one before it, as closing a tab opens the tab beside it.
export function removeAnimation(project, id) {
  const at = project.animations.findIndex((animation) => animation.id === id);

  if (project.animations.length > 1 && at >= 0) {
    project.animations.splice(at, 1);
  }

  return project.animations[Math.max(0, at - 1)];
}
