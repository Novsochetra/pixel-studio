import { cloneSprite } from './sprite.js';
import { newAnimation, newFrame, newId, newLayer } from './project.js';
import { BODY_KIND, bodyOf, isBody } from './body/body-kind.js';

export const framesOf = (animation) =>
  Object.values(animation.directions).flatMap((entry) => entry.frames);

export const copyOfLayer = (layer) => ({
  ...layer,
  id: newId('l'),
  sprite: layer.sprite ? cloneSprite(layer.sprite) : null,
});

export const copyOfFrame = (frame, canvas) =>
  newFrame(canvas.width, canvas.height, frame.layers.map(copyOfLayer));

// An empty frame has one empty layer of art, and the Body once the animation has one, to pose.
// They keep the keys of the animation's own, so the layer being edited follows into the new frame.
export function blankFrame(animation, canvas) {
  const { width, height } = canvas;
  const stack = framesOf(animation).flatMap((frame) => frame.layers);
  const art = stack.find((layer) => layer.kind === 'art');
  const body = stack.find(isBody);
  const layers = [newLayer(width, height, { name: art?.name, key: art?.key })];

  if (body) {
    layers.push(newLayer(width, height, { name: body.name, key: body.key, kind: BODY_KIND }));
  }

  return newFrame(width, height, layers);
}

// a new view has as many frames as the others, since every frame is a moment of all of them
export function addDirection(project, animation, direction, copyFrom = null) {
  const source = copyFrom ? animation.directions[copyFrom]?.frames : null;
  const count = Math.max(
    1,
    ...Object.values(animation.directions).map((entry) => entry.frames.length),
  );

  const rig = copyFrom ? animation.directions[copyFrom]?.rig : null;
  const frames = source
    ? source.map((frame) => copyOfFrame(frame, project.canvas))
    : Array.from({ length: count }, () => blankFrame(animation, project.canvas));

  animation.directions[direction] = { frames, ...(rig ? { rig } : {}) };
}

export function removeDirection(animation, direction) {
  if (Object.keys(animation.directions).length > 1) {
    delete animation.directions[direction];
  }
}

export function addLayer(project, frame, { name, kind = 'art', above = null }) {
  const layer = newLayer(project.canvas.width, project.canvas.height, { name, kind });
  const at = above
    ? frame.layers.findIndex((other) => other.key === above) + 1
    : frame.layers.length;

  frame.layers.splice(at, 0, layer);

  return layer.key;
}

export function updateLayer(frame, key, patch) {
  const layer = frame.layers.find((other) => other.key === key);

  if (layer) {
    Object.assign(layer, patch);
  }
}

export const setLayerShown = (frame, key, visible) => updateLayer(frame, key, { visible });

const artCount = (frame) => frame.layers.filter((layer) => layer.kind === 'art').length;

// a picture cleaned into a frame needs a layer of art to land on
export const canRemoveLayer = (frame, key) =>
  frame.layers.find((layer) => layer.key === key)?.kind !== 'art' || artCount(frame) > 1;

export function removeLayer(animation, frame, key) {
  if (!canRemoveLayer(frame, key)) {
    return false;
  }

  frame.layers = frame.layers.filter((layer) => layer.key !== key);
  forgetCutsWithoutBody(animation);

  return true;
}

// once no frame has a Body, the cuts it was drawn from go too
export function forgetCutsWithoutBody(animation) {
  if (framesOf(animation).some(bodyOf)) {
    return;
  }

  for (const entry of Object.values(animation.directions)) {
    delete entry.rig;
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
