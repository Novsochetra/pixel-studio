import { newAnimation, newId } from './project.js';
import { drawableDirections } from './directions.js';
import { NAGA_ELEVEN, blankPreset, defaultName, validDirectionSet } from './presets.js';
import { normalizeProject } from './normalize.js';

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

const partsOf = (preset) =>
  (preset.parts ?? []).map((name) => ({ id: name.toLowerCase(), name, colours: [] }));

// options: { name, kind, preset, directionSet, width, height, scale, startWith, animation }
export function newProject(options = {}) {
  const preset = presetFor(options);
  const project = {
    version: 3,
    id: newId('p'),
    name: options.name ?? defaultName(preset),
    kind: preset.kind,
    game: structuredClone(preset.game ?? {}),
    directionSet: validDirectionSet(options.directionSet ?? preset.directionSet, preset.kind),
    canvas: canvasFor(preset, options),
    parts: partsOf(preset),
    guides: structuredClone(preset.guides ?? []),
  };
  const directions = startingDirections(project, preset, options);
  const name = options.animation ?? preset.names?.[0] ?? 'Idle';

  return normalizeProject({
    ...project,
    referenceDirection: directions[0],
    animations: [newAnimation(name, project.canvas, directions)],
  });
}
