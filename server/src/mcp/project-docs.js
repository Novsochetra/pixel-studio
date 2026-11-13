import { describeProject } from '../../../src/model/presets.js';
import { allLayers } from '../../../src/model/project.js';
import { joinCuts } from '../../../src/model/body/shared-cuts.js';
import { keysFor } from '../../../src/store/keys.js';
import { projectStructure } from '../../../src/store/load.js';
import { pngUrl, spriteOfUrl } from '../../../tools/mcp/project-files.js';

const INDEX = 'projects';

const layersOf = (project) => [...allLayers(project)].map(({ layer }) => layer);

// A project as the studio saves it in an account (src/store/saver.js): its structure in one
// document and each layer's picture in its own. `seen` keeps each picture as it was read, so a
// change writes only the layers it changed: every picture goes to the bucket.
export async function readProjectDocs(backend, { prefix, seen }) {
  const keys = keysFor(prefix);
  const stored = await backend.read(keys.project);

  if (!stored?.json) {
    throw new Error('That project could not be read from your saved work.');
  }

  const project = joinCuts(JSON.parse(stored.json));
  const layers = layersOf(project);
  const docs = await Promise.all(layers.map((layer) => backend.read(keys.layer(layer.id))));

  layers.forEach((layer, i) => {
    seen.set(layer.id, docs[i]?.png ?? null);
    layer.sprite = docs[i]?.png ? spriteOfUrl(docs[i].png) : null;
  });

  return project;
}

export async function writeProjectDocs(backend, project, { prefix, seen }) {
  const keys = keysFor(prefix);
  const changed = layersOf(project)
    .filter((layer) => layer.sprite)
    .map((layer) => [layer.id, pngUrl(layer.sprite)])
    .filter(([id, png]) => seen.get(id) !== png);

  await backend.writeAll([
    ...changed.map(([id, png]) => [keys.layer(id), { png }]),
    [keys.project, { json: JSON.stringify(projectStructure(project)), savedAt: Date.now() }],
  ]);
  changed.forEach(([id, png]) => seen.set(id, png));
  // the studio draws a project's picture in the list again from its frames when it has none
  await backend.remove(keys.portrait);
}

export async function readProjectList(backend) {
  const index = await backend.read(INDEX);

  return index?.list ? { folders: [], ...index } : { list: [], current: null, folders: [] };
}

// the project's entry made or brought up to date, so Projects lists it first
export async function listProject(backend, project, prefix) {
  const index = await readProjectList(backend);
  const old = index.list.find((entry) => entry.id === project.id);
  const entry = {
    ...old,
    id: project.id,
    name: project.name,
    about: describeProject(project),
    prefix,
    updatedAt: Date.now(),
  };

  index.list = old
    ? index.list.map((each) => (each === old ? entry : each))
    : [...index.list, entry];
  await backend.write(INDEX, index);
}
