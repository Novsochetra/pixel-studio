import { describeProject } from '../model/presets.js';
import { allLayers } from '../model/project.js';
import { keysFor } from './keys.js';
import { deleteAllVersions } from './versions.js';

const INDEX = 'projects';

// The projects list: { list: [{ id, name, about, prefix, updatedAt, folder }], current: id,
// folders: [{ id, name }] }. Read twice before giving up, then marked unreadable so nothing writes
// an empty list over the real one.
export async function readIndex(backend) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const index = await backend.read(INDEX);

      return index?.list ? { folders: [], ...index } : { list: [], current: null, folders: [] };
    } catch {
      // a dropped request: once more
    }
  }

  return { list: [], current: null, folders: [], unreadable: true };
}

export function writeIndex(backend, { list, current, folders }) {
  return backend.write(INDEX, { list, current, folders });
}

function entryFor(project, { prefix, folder }) {
  return {
    id: project.id,
    name: project.name,
    about: describeProject(project),
    prefix,
    updatedAt: Date.now(),
    ...(folder ? { folder } : {}),
  };
}

// the entry for this project, added or refreshed; true when the list changed
export function upsertEntry(index, project, prefix) {
  const at = index.list.findIndex((entry) => entry.id === project.id);
  const entry = entryFor(project, at >= 0 ? index.list[at] : { prefix });

  if (at < 0) {
    index.list.push(entry);

    return true;
  }

  const old = index.list[at];
  const changed = old.name !== entry.name || old.about !== entry.about;
  // The list is written again at most once a minute for the same project's edits, but at once
  // when another project was edited since: then the order of Recent changes. Edits to three
  // projects within a minute listed them in the wrong order.
  const latest = index.list.every((other) => (other.updatedAt ?? 0) <= (old.updatedAt ?? 0));
  const stale = Date.now() - old.updatedAt > 60000;

  index.list[at] = changed || stale || !latest ? entry : old;

  return changed || index.list[at] !== old;
}

// An entry from this visit put into a list read later, in place of the same project's. This visit
// could not see the folders, so a project keeps the folder the list read later gives it.
function mergeEntry(index, entry) {
  const at = index.list.findIndex((listed) => listed.id === entry.id);
  const folder = entry.folder ?? index.list[at]?.folder;

  if (at < 0) {
    index.list.push(entry);
  } else {
    index.list[at] = { ...entry, ...(folder ? { folder } : {}) };
  }
}

function mergeFolders(index, folders) {
  const known = new Set(index.folders.map((folder) => folder.id));

  index.folders.push(...folders.filter((folder) => !known.has(folder.id)));
}

// The list is only written when it was read: one written from an empty guess would drop every
// project this visit did not see. While it cannot be read, each save tries again, and the work of
// this visit joins the real list once it can.
export async function saveProjectList(backend, index) {
  if (index.unreadable) {
    const read = await readIndex(backend);

    if (read.unreadable) {
      return;
    }

    index.list.forEach((entry) => mergeEntry(read, entry));
    mergeFolders(read, index.folders ?? []);
    delete index.unreadable;
    index.list = read.list;
    index.folders = read.folders;
  }

  await joinOtherVisits(backend, index);
  await writeIndex(backend, index);
}

// Projects and folders another tab made since this one read the list are not this tab's to drop:
// they join its list before it is written. Those this tab deleted itself stay gone.
async function joinOtherVisits(backend, index) {
  const stored = await backend.read(INDEX).catch(() => null);
  const gone = index.deleted ?? new Set();
  const ours = new Set(index.list.map((entry) => entry.id));

  index.list.push(
    ...(stored?.list ?? []).filter((entry) => !ours.has(entry.id) && !gone.has(entry.id)),
  );
  mergeFolders(
    index,
    (stored?.folders ?? []).filter((folder) => !gone.has(folder.id)),
  );
}

// a project or folder taken out of the list in this visit, so a later save does not bring it back
export function forget(index, id) {
  index.deleted ??= new Set();
  index.deleted.add(id);
}

// every document of one project: its layers, structure, picture and versions
export async function deleteProjectData(backend, prefix) {
  const keys = keysFor(prefix);
  const stored = await backend.read(keys.project);

  if (stored?.json) {
    for (const { layer } of allLayers(JSON.parse(stored.json))) {
      await backend.remove(keys.layer(layer.id));
    }
  }

  await backend.remove(keys.project);
  // a project saved while the studio had a scene to preview it in may have that scene's picture
  await backend.remove(keys.background);
  await backend.remove(keys.portrait);
  await deleteAllVersions(backend, keys);
}

// the names of every project but this one: a name it takes is free of them (freeName)
export const namesBesides = (index, id) =>
  index.list.filter((entry) => entry.id !== id).map(({ name }) => name);
