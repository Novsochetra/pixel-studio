import { createSprite } from './sprite.js';
import { PROFILES, drawableDirections, profileOf } from './profiles.js';

// every direction's name, for any direction set (see profiles.js)
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
export function newLayer(
  width,
  height,
  name = 'Art',
  sprite = createSprite(width, height),
  key = newId('k'),
  kind = 'art',
) {
  return {
    id: newId('l'),
    key,
    name,
    kind,
    visible: true,
    opacity: kind === 'reference' ? 0.45 : 1,
    sprite,
  };
}

export function newFrame(width, height, layers = [newLayer(width, height)]) {
  return { id: newId('f'), layers };
}

export function newAnimation(name, canvas, directions) {
  const key = newId('k');
  const frame = () =>
    newFrame(canvas.width, canvas.height, [
      newLayer(canvas.width, canvas.height, 'Art', undefined, key),
    ]);

  return {
    id: newId('a'),
    name,
    fps: 8,
    directions: Object.fromEntries(directions.map((id) => [id, { frames: [frame()] }])),
  };
}

function normalizeLayers(project) {
  for (const animation of project.animations) {
    for (const entry of Object.values(animation.directions)) {
      for (const frame of entry.frames) {
        frame.layers.forEach((layer, i) => {
          layer.key ??= `layer${i}`;
          layer.kind ??= 'art';
          layer.visible ??= true;
          layer.opacity ??= 1;
        });
      }
    }

    animation.fps ??= 8;
  }
}

// kit parts were once fixed to a football kit ({ shirt: [colours], … }): now any named parts
function normalizeParts(project) {
  if (!project.parts) {
    const old = project.kitParts ?? {};
    const names = profileOf(project).parts;
    project.parts = names.map((name) => ({
      id: name.toLowerCase(),
      name,
      colours: old[name.toLowerCase()] ?? [],
    }));
  }

  delete project.kitParts;
  project.outfits ??= [];
}

// Projects saved by earlier versions were all Sochetra for Naga Eleven: they keep that, and gain
// any fields added since.
export function normalizeProject(project) {
  project.id ??= newId('p');
  project.profile ??= 'naga-eleven';
  project.directionSet ??= PROFILES[project.profile]?.directionSet ?? 'four';
  normalizeLayers(project);
  normalizeParts(project);
  project.palettes ??= [];
  project.mappings = Array.isArray(project.mappings) || !project.mappings ? {} : project.mappings;
  project.guides ??= [];
  project.exportSettings ??= null;
  project.preview ??= null;

  return project;
}

// options: { name, profile, directionSet, width, height, scale, startWith }
export function newProject(options = {}) {
  const profile = PROFILES[options.profile] ? options.profile : 'naga-eleven';
  const canvas = {
    width: options.width ?? 160,
    height: options.height ?? 160,
    scale: options.scale ?? 5,
  };
  const project = {
    version: 2,
    id: newId('p'),
    name: options.name ?? 'Sochetra',
    profile,
    directionSet: options.directionSet ?? PROFILES[profile].directionSet,
    canvas,
  };
  const drawable = drawableDirections(project);
  const start = options.startWith ?? PROFILES[profile].startWith ?? drawable;
  const directions = start.filter((direction) => drawable.includes(direction));

  return normalizeProject({
    ...project,
    referenceDirection: directions[0] ?? drawable[0],
    animations: [
      newAnimation(
        options.animation ?? 'Pose',
        canvas,
        directions.length ? directions : [drawable[0]],
      ),
    ],
    palettes: [],
    mappings: {},
    guides: [],
  });
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
      for (const [frameIndex, frame] of entry.frames.entries()) {
        for (const layer of frame.layers) {
          yield { animation, direction, frameIndex, frame, layer };
        }
      }
    }
  }
}
