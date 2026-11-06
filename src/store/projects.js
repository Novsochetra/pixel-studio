import { describeProject } from '../model/presets.js';
import { allLayers } from '../model/project.js';
import { keysFor } from './keys.js';
import { deleteAllVersions } from './versions.js';

const INDEX = 'projects';

// the projects list: { list: [{ id, name, about, prefix, updatedAt }], current: id }; read twice
// before giving up, then marked unreadable so nothing writes an empty list over the real one
export async function readIndex(backend) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const index = await backend.read(INDEX);

      return index?.list ? index : { list: [], current: null };
    } catch {
      // a dropped request: once more
    }
  }

  return { list: [], current: null, unreadable: true };
}

export function writeIndex(backend, index) {
  return backend.write(INDEX, { list: index.list, current: index.current });
}

export function entryFor(project, prefix) {
  return {
    id: project.id,
    name: project.name,
    about: describeProject(project),
    prefix,
    updatedAt: Date.now(),
  };
}

// the entry for this project, added or refreshed; true when the list changed
export function upsertEntry(index, project, prefix) {
  const at = index.list.findIndex((entry) => entry.id === project.id);
  const entry = entryFor(project, at >= 0 ? index.list[at].prefix : prefix);

  if (at < 0) {
    index.list.push(entry);

    return true;
  }

  const old = index.list[at];
  const changed = old.name !== entry.name || old.about !== entry.about;
  index.list[at] = changed || Date.now() - old.updatedAt > 60000 ? entry : old;

  return changed || index.list[at] !== old;
}

// an entry from this visit put into a list read later, in place of the same project's
export function mergeEntry(index, entry) {
  const at = index.list.findIndex((listed) => listed.id === entry.id);
  at < 0 ? index.list.push(entry) : (index.list[at] = entry);
}

// every document of one project: its layers, structure, background and versions
export async function deleteProjectData(backend, prefix) {
  const keys = keysFor(prefix);
  const stored = await backend.read(keys.project);

  if (stored?.json) {
    for (const { layer } of allLayers(JSON.parse(stored.json))) {
      await backend.remove(keys.layer(layer.id));
    }
  }

  await backend.remove(keys.project);
  await backend.remove(keys.background);
  await deleteAllVersions(backend, keys);
}
