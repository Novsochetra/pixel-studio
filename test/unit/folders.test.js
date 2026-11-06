import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  addFolder,
  byFolder,
  folderOf,
  freshFolderName,
  moveToFolder,
  removeFolder,
  renameFolder,
} from '../../src/store/folders.js';
import { readIndex, saveProjectList, upsertEntry } from '../../src/store/projects.js';
import { newProject } from '../../src/model/new-project.js';

function memory(docs = new Map()) {
  return {
    docs,
    read: async (key) => structuredClone(docs.get(key) ?? null),
    write: async (key, value) => docs.set(key, structuredClone(value)),
    remove: async (key) => docs.delete(key),
  };
}

const listOf = (...names) => ({
  list: names.map((name) => ({ id: name.toLowerCase(), name, prefix: `p-${name}-` })),
  current: null,
});

const shape = (index) =>
  byFolder(index).map(({ folder, entries }) => [
    folder?.name ?? null,
    entries.map((entry) => entry.name),
  ]);

test('projects are grouped by folder, in the folders’ order, then those in none', () => {
  const index = listOf('Hero', 'Rival', 'Grass');
  const game = addFolder(index, 'Naga Eleven');
  const tiles = addFolder(index, 'Tiles');

  moveToFolder(index, 'hero', game.id);
  moveToFolder(index, 'rival', game.id);
  moveToFolder(index, 'grass', tiles.id);
  moveToFolder(index, 'grass', 'no-such-folder');

  assert.deepEqual(shape(index), [
    ['Naga Eleven', ['Hero', 'Rival']],
    ['Tiles', []],
    [null, ['Grass']],
  ]);
  assert.equal(folderOf(index, 'hero'), game.id);
  assert.equal(folderOf(index, 'grass'), null);
});

test('a new folder never takes the name of another, and a blank name is no rename', () => {
  const index = listOf();

  addFolder(index);
  assert.equal(freshFolderName(index), 'New folder 2');
  const folder = addFolder(index);

  renameFolder(index, folder.id, '  Enemies ');
  renameFolder(index, folder.id, '   ');
  assert.deepEqual(
    index.folders.map((each) => each.name),
    ['New folder', 'Enemies'],
  );
});

test('removing a folder keeps its projects, out of any folder', () => {
  const index = listOf('Hero', 'Rival');
  const game = addFolder(index, 'Naga Eleven');

  moveToFolder(index, 'hero', game.id);
  removeFolder(index, game.id);

  assert.deepEqual(shape(index), [[null, ['Hero', 'Rival']]]);
  assert.equal(index.list[0].folder, undefined);
});

test('a project keeps its folder when its entry is refreshed and when the list is saved', async () => {
  const backend = memory();
  const index = await readIndex(backend);
  const hero = newProject({ name: 'Hero' });

  upsertEntry(index, hero, 'p-hero-');
  const game = addFolder(index, 'Naga Eleven');

  moveToFolder(index, hero.id, game.id);
  hero.name = 'Hero 2';
  upsertEntry(index, hero, 'p-hero-');
  await saveProjectList(backend, index);
  const read = await readIndex(backend);

  assert.deepEqual(shape(read), [
    ['Naga Eleven', ['Hero 2']],
    [null, []],
  ]);
});

test('work from a visit that could not read the list keeps the folders the list has', async () => {
  const saved = listOf('Hero', 'Rival');
  const game = addFolder(saved, 'Naga Eleven');

  moveToFolder(saved, 'hero', game.id);
  const backend = memory(new Map([['projects', saved]]));
  const visit = { list: [{ ...saved.list[0], folder: undefined }], current: 'hero', folders: [] };

  visit.unreadable = true;
  const enemies = addFolder(visit, 'Enemies');

  await saveProjectList(backend, visit);
  const read = await readIndex(backend);

  assert.deepEqual(
    read.folders.map((folder) => folder.id),
    [game.id, enemies.id],
  );
  assert.equal(folderOf(read, 'hero'), game.id);
});
