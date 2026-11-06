import { allLayers } from '../model/project.js';
import { dataUrlSprite, spriteDataUrl } from '../io/images.js';
import { projectStructure } from './load.js';
import { joinCuts } from '../model/body/shared-cuts.js';

// A whole project as one JSON text: its structure, with each layer's pixels as a PNG data URL, and
// its own preview background when it has one.
export function projectFileText(project, background = null) {
  const copy = projectStructure(project);
  const pngs = {};

  for (const { layer } of allLayers(project)) {
    pngs[layer.id] = layer.sprite ? spriteDataUrl(layer.sprite) : null;
  }

  return JSON.stringify({
    kind: 'pixel-clean-studio',
    version: 1,
    project: copy,
    pngs,
    ...(background ? { background } : {}),
  });
}

// { project, background }: background is a data URL, or null
export async function readProjectBundle(text) {
  const file = JSON.parse(text);

  if (file.kind !== 'pixel-clean-studio' || !file.project) {
    throw new Error('This is not a Pixel Clean Studio project file.');
  }

  for (const { layer } of allLayers(file.project)) {
    const png = file.pngs?.[layer.id];

    layer.sprite = png ? await dataUrlSprite(png) : null;
  }

  const background =
    typeof file.background === 'string' && file.background.startsWith('data:image/')
      ? file.background
      : null;

  return { project: joinCuts(file.project), background };
}

export async function readProjectFile(text) {
  return (await readProjectBundle(text)).project;
}
