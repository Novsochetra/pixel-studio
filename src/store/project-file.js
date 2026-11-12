import { allLayers } from '../model/project.js';
import { dataUrlSprite, spriteDataUrl } from '../io/images.js';
import { projectStructure } from './load.js';
import { joinCuts } from '../model/body/shared-cuts.js';
import { told } from '../model/told.js';

// A whole project as one JSON text: its structure, with each layer's pixels as a PNG data URL.
export function projectFileText(project) {
  const copy = projectStructure(project);
  const pngs = {};

  for (const { layer } of allLayers(project)) {
    pngs[layer.id] = layer.sprite ? spriteDataUrl(layer.sprite) : null;
  }

  return JSON.stringify({ kind: 'pixel-clean-studio', version: 1, project: copy, pngs });
}

// a picture opened here as a project was only said not to be one: where pictures go is said too
const NOT_A_PROJECT =
  'This is not a Pixel Clean Studio project file. To bring in a picture, drop it on the canvas or use "Image into this frame…" in a frame’s menu.';

// the file as an object, or null when it is not JSON at all
function parsed(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// a project has animations, each with its views' frames and their layers: enough to open it
function looksLikeProject(project) {
  const animations = project?.animations;

  return (
    Array.isArray(animations) &&
    animations.length > 0 &&
    animations.every((animation) =>
      Object.values(animation?.directions ?? {}).every(
        (entry) =>
          Array.isArray(entry?.frames) &&
          entry.frames.every((frame) => Array.isArray(frame?.layers)),
      ),
    ) &&
    Number.isInteger(project.canvas?.width) &&
    Number.isInteger(project.canvas?.height)
  );
}

export async function readProjectFile(text) {
  const file = parsed(text);

  if (file?.kind !== 'pixel-clean-studio' || !file.project) {
    throw told(NOT_A_PROJECT);
  }

  if (!looksLikeProject(file.project)) {
    throw told('This project file is damaged: its animations and frames cannot be read.');
  }

  for (const { layer } of allLayers(file.project)) {
    const png = file.pngs?.[layer.id];

    layer.sprite = png ? await dataUrlSprite(png) : null;
  }

  return joinCuts(file.project);
}
