import { createSprite } from './sprite.js';

// every direction's name, for any direction set (see directions.js)
export const DIRECTIONS = [
  { id: 'south', label: 'Front' },
  { id: 'south-east', label: 'Front side' },
  { id: 'east', label: 'Side' },
  { id: 'north-east', label: 'Back side' },
  { id: 'north', label: 'Back' },
  { id: 'north-west', label: 'Back side, left' },
  { id: 'west', label: 'Side, left' },
  { id: 'south-west', label: 'Front side, left' },
];

let counter = 0;

export function newId(prefix) {
  counter += 1;

  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function directionLabel(id) {
  return DIRECTIONS.find((direction) => direction.id === id)?.label ?? id;
}

// A layer is one frame's cel of a named layer; `key` ties the cels of one layer together across
// frames. A 'reference' layer holds a picture to trace over: shown faded, never exported.
export function newLayer(width, height, options = {}) {
  const kind = options.kind ?? 'art';

  return {
    id: newId('l'),
    key: options.key ?? newId('k'),
    name: options.name ?? 'Art',
    kind,
    visible: true,
    opacity: kind === 'reference' ? 0.45 : 1,
    sprite: options.sprite ?? createSprite(width, height),
  };
}

export function newFrame(width, height, layers = [newLayer(width, height)]) {
  return { id: newId('f'), layers };
}

export function newAnimation(name, canvas, directions) {
  const key = newId('k');
  const frame = () =>
    newFrame(canvas.width, canvas.height, [newLayer(canvas.width, canvas.height, { key })]);

  return {
    id: newId('a'),
    name,
    fps: 8,
    directions: Object.fromEntries(directions.map((id) => [id, { frames: [frame()] }])),
  };
}

export function frameAt(project, at) {
  const animation =
    project.animations.find((candidate) => candidate.id === at.animation) ?? project.animations[0];
  const frames = animation.directions[at.direction]?.frames ?? [];

  return frames[Math.min(at.frame ?? 0, frames.length - 1)] ?? null;
}

// the layer being edited: the one with the chosen key, else the first art layer
export function layerAt(project, at) {
  const frame = frameAt(project, at);

  if (!frame) {
    return null;
  }

  return (
    frame.layers.find((layer) => layer.key === at.layer) ??
    frame.layers.find((layer) => layer.kind !== 'reference') ??
    frame.layers[0]
  );
}

// every layer in the project, with where it sits
export function* allLayers(project) {
  for (const animation of project.animations) {
    for (const [direction, entry] of Object.entries(animation.directions)) {
      yield* framesLayers(animation, direction, entry.frames);
    }
  }
}

function* framesLayers(animation, direction, frames) {
  for (const [frameIndex, frame] of frames.entries()) {
    for (const layer of frame.layers) {
      yield { animation, direction, frameIndex, frame, layer };
    }
  }
}
