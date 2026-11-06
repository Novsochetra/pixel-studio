import { allLayers } from '../model/project.js';
import { dataUrlSprite } from '../io/images.js';
import { keysFor } from './keys.js';

// the project without its pixels: layers keep their ids, their PNGs are separate documents
export function projectStructure(project) {
  return JSON.parse(
    JSON.stringify(project, (key, value) => (key === 'sprite' ? undefined : value)),
  );
}

export async function loadProject(backend, keys = keysFor('')) {
  const stored = await backend.read(keys.project);

  if (!stored?.json) {
    return null;
  }

  const project = JSON.parse(stored.json);
  const layers = [...allLayers(project)].map(({ layer }) => layer);
  const docs = await Promise.all(layers.map((layer) => backend.read(keys.layer(layer.id))));

  await Promise.all(
    layers.map(async (layer, i) => {
      layer.sprite = docs[i]?.png ? await dataUrlSprite(docs[i].png) : null;
    }),
  );

  return project;
}
