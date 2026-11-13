import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png.js';
import { allLayers } from '../../src/model/project.js';
import { joinCuts } from '../../src/model/body/shared-cuts.js';
import { projectStructure } from '../../src/store/load.js';

const PREFIX = 'data:image/png;base64,';

export function spriteOfUrl(dataUrl) {
  const { width, height, data } = decodePng(Buffer.from(dataUrl.slice(PREFIX.length), 'base64'));

  return { width, height, pixels: new Uint8ClampedArray(data) };
}

// a file that is not JSON at all is not a project, said as one that is JSON of another kind
function parsed(words) {
  try {
    return JSON.parse(words);
  } catch {
    return null;
  }
}

// The file the studio's "Save project file" writes and "Open a project file…" reads: the project's
// structure, with each layer's pixels as a PNG data URL (src/store/project-file.js).
export function readProject(path) {
  const file = parsed(readFileSync(path, 'utf8'));

  if (file?.kind !== 'pixel-clean-studio' || !Array.isArray(file.project?.animations)) {
    throw new Error(`${path} is not a Pixel Clean Studio project file.`);
  }

  for (const { layer } of allLayers(file.project)) {
    const png = file.pngs?.[layer.id];

    layer.sprite = png ? spriteOfUrl(png) : null;
  }

  return joinCuts(file.project);
}

export const pngUrl = (sprite) => PREFIX + encodePng(sprite).toString('base64');

export function writeProject(path, project) {
  const pngs = {};

  for (const { layer } of allLayers(project)) {
    pngs[layer.id] = layer.sprite ? pngUrl(layer.sprite) : null;
  }

  const file = { kind: 'pixel-clean-studio', version: 1, project: projectStructure(project), pngs };

  writeFileSync(path, JSON.stringify(file));
}
