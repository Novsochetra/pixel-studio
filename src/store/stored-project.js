import { keysFor } from './keys.js';
import { loadProject } from './load.js';

// A saved project that is not the open one, changed where it is saved: its name in its own
// document and in the list's entry, which the caller writes. False when it could not be read.
export async function renameStored(backend, entry, name) {
  const keys = keysFor(entry.prefix);
  const stored = await backend.read(keys.project);

  if (!stored?.json) {
    return false;
  }

  const json = JSON.stringify({ ...JSON.parse(stored.json), name });

  await backend.write(keys.project, { ...stored, json, savedAt: Date.now() });
  Object.assign(entry, { name, updatedAt: Date.now() });

  return true;
}

// the whole of a saved project and the picture behind it, to make a copy from; null when it
// could not be read
export async function readStored(backend, entry) {
  const keys = keysFor(entry.prefix);
  const project = await loadProject(backend, keys);
  const background = project && (await backend.read(keys.background).catch(() => null));

  return project ? { project, background: background?.url ?? null } : null;
}
