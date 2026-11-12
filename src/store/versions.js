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

export async function saveVersion(backend, project, name, keys = keysFor('')) {
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
    name,
    earlier.map((version) => version.name),
  );
  const list = [{ id, name: named, savedAt: Date.now(), chunks, size: text.length }, ...earlier];

  for (const old of list.slice(KEEP)) {
    await deleteVersionChunks(backend, old, keys);
  }

  await backend.write(keys.versions, { list: list.slice(0, KEEP) });

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
