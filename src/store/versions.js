import { projectFileText, readProjectFile } from './project-file.js';
import { newId } from '../model/project.js';
import { freeName } from '../model/free-name.js';
import { keysFor } from './keys.js';

// a stored document holds at most 256 KiB, so a big project is kept in pieces
const CHUNK = 200000;
const KEEP = 30;

export async function listVersions(backend, keys = keysFor('')) {
  return (await backend.read(keys.versions))?.list ?? [];
}

// Past the limit the oldest go, the ones kept on their own (before a cleaning, a resize) first:
// thirty imports pushed out a version someone had named and saved by hand, without a word.
export function versionsKept(list) {
  const over = list.length - KEEP;

  if (over <= 0) {
    return { kept: list, gone: [] };
  }

  // the list is newest first: the oldest kept on their own, then the oldest saved by hand
  const oldestFirst = [...list].reverse();
  const order = [
    ...oldestFirst.filter((version) => !version.byHand),
    ...oldestFirst.filter((version) => version.byHand),
  ];
  const gone = new Set(order.slice(0, over));

  return { kept: list.filter((version) => !gone.has(version)), gone: [...gone] };
}

// `name`: the version's name, or { name, byHand } for one saved in History by hand
export async function saveVersion(backend, project, name, keys = keysFor('')) {
  const { name: wanted, byHand = false } = typeof name === 'string' ? { name } : name;
  const text = projectFileText(project);
  const id = newId('v');
  const chunks = Math.ceil(text.length / CHUNK);

  for (let chunk = 0; chunk < chunks; chunk++) {
    await backend.write(keys.versionChunk(id, chunk), {
      text: text.slice(chunk * CHUNK, (chunk + 1) * CHUNK),
    });
  }

  const earlier = await listVersions(backend, keys);
  const named = freeName(
    wanted,
    earlier.map((version) => version.name),
  );
  const entry = { id, name: named, savedAt: Date.now(), chunks, size: text.length, byHand };
  const { kept, gone } = versionsKept([entry, ...earlier]);

  for (const old of gone) {
    await deleteVersionChunks(backend, old, keys);
  }

  await backend.write(keys.versions, { list: kept });

  return id;
}

async function deleteVersionChunks(backend, entry, keys) {
  for (let chunk = 0; chunk < entry.chunks; chunk++) {
    await backend.remove(keys.versionChunk(entry.id, chunk));
  }
}

export async function deleteVersion(backend, id, keys = keysFor('')) {
  const list = await listVersions(backend, keys);
  const entry = list.find((version) => version.id === id);

  if (entry) {
    await deleteVersionChunks(backend, entry, keys);
    await backend.write(keys.versions, { list: list.filter((version) => version.id !== id) });
  }
}

export async function deleteAllVersions(backend, keys) {
  for (const entry of await listVersions(backend, keys)) {
    await deleteVersionChunks(backend, entry, keys);
  }

  await backend.remove(keys.versions);
}

export async function versionText(backend, entry, keys = keysFor('')) {
  let text = '';

  for (let chunk = 0; chunk < entry.chunks; chunk++) {
    text += (await backend.read(keys.versionChunk(entry.id, chunk)))?.text ?? '';
  }

  return text;
}

export async function loadVersion(backend, entry, keys = keysFor('')) {
  return readProjectFile(await versionText(backend, entry, keys));
}
