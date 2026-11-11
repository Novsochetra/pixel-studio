import { newAnimation, newId } from './project.js';
import { drawableDirections } from './directions.js';
import { NAGA_ELEVEN, blankPreset, defaultName, validDirectionSet } from './presets.js';
import { normalizeProject } from './normalize.js';
import { KINDS } from './kinds.js';
import { newGuide } from '../views/guides.js';

// the preset a new project starts from: one given, a blank one for a kind, else Naga Eleven's
function presetFor(options) {
  if (options.preset) {
    return options.preset;
  }

  return options.kind ? blankPreset(options.kind) : NAGA_ELEVEN;
}

function startingDirections(project, preset, options) {
  const drawable = drawableDirections(project);
  const start = options.startWith ?? preset.startWith ?? drawable;
  const directions = start.filter((direction) => drawable.includes(direction));

  return directions.length ? directions : [drawable[0]];
}

const canvasFor = (preset, options) => ({
  width: options.width ?? preset.canvas.width,
  height: options.height ?? preset.canvas.height,
  scale: options.scale ?? preset.canvas.scale,
});

// a preset's parts are names, or { name, colours } from a project saved as a preset
const partsOf = (preset) =>
  (preset.parts ?? []).map((part) => {
    const { name, colours = [] } = typeof part === 'string' ? { name: part } : part;

    return { id: name.toLowerCase(), name, colours: [...colours] };
  });

// what a project saved as a preset carries over besides its shape
const carried = (preset) => ({
  palettes: structuredClone(preset.palettes ?? []),
  exportSettings: structuredClone(preset.exportSettings ?? null),
});

// What a project of icons or tiles holds is the art itself, one to a tab: the first takes the
// name the project was given. Named Gem, it began with an icon called Coin, and its files were
// coin.png. An animation (Idle, Walk) is not the art, and keeps its own name.
function firstName(project, preset) {
  const isArt = (KINDS[preset.kind]?.itemName ?? 'animation') !== 'animation';

  return isArt && project.name !== defaultName(preset) ? project.name : preset.names?.[0];
}

function firstAnimation(project, preset, { animation: name, directions }) {
  const animation = newAnimation(
    name ?? firstName(project, preset) ?? 'Idle',
    project.canvas,
    directions,
  );

  animation.fps = preset.fps ?? animation.fps;

  return animation;
}

// the line a new project's art stands on, so every view and frame ends at the same row
function startingGuides(preset, height) {
  if (preset.guides?.length) {
    return structuredClone(preset.guides);
  }

  const ground = KINDS[preset.kind]?.ground;

  if (!ground) {
    return [];
  }

  return [
    newGuide(preset.kind === 'object' ? 'Ground' : 'Feet', Math.round(height * ground), 'bottom'),
  ];
}

// options: { name, kind, preset, directionSet, width, height, scale, startWith, animation }
export function newProject(options = {}) {
  const preset = presetFor(options);
  const canvas = canvasFor(preset, options);
  const project = {
    version: 3,
    id: newId('p'),
    name: options.name ?? defaultName(preset),
    kind: preset.kind,
    game: structuredClone(preset.game ?? {}),
    directionSet: validDirectionSet(options.directionSet ?? preset.directionSet, preset.kind),
    canvas,
    parts: partsOf(preset),
    guides: startingGuides(preset, canvas.height),
    ...carried(preset),
  };
  const directions = startingDirections(project, preset, options);

  return normalizeProject({
    ...project,
    referenceDirection: directions.includes(preset.referenceDirection)
      ? preset.referenceDirection
      : directions[0],
    animations: [firstAnimation(project, preset, { ...options, directions })],
  });
}
