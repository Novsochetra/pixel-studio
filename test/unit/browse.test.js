import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  EVERY_PROJECT,
  NO_FOLDER,
  countsByPlace,
  foldersByName,
  foldersMatching,
  knownPlace,
  projectsIn,
} from '../../src/store/browse.js';
import { addFolder, moveToFolder, removeFolder } from '../../src/store/folders.js';

function cast() {
  const index = {
    list: [
      { id: 'hero', name: 'Hero', about: 'Character for Naga Eleven', updatedAt: 3 },
      { id: 'rival', name: 'Rival', about: 'Character for Naga Eleven', updatedAt: 5 },
      { id: 'grass', name: 'Grass', about: 'Tiles', updatedAt: 4 },
      { id: 'spark', name: 'spark', about: 'Effect', updatedAt: 1 },
    ],
    current: 'hero',
  };
  const game = addFolder(index, 'Naga Eleven');
  const tiles = addFolder(index, 'Tiles 10');

  addFolder(index, 'Tiles 9');
  moveToFolder(index, 'hero', game.id);
  moveToFolder(index, 'rival', game.id);
  moveToFolder(index, 'grass', tiles.id);

  return { index, game, tiles };
}

const names = (entries) => entries.map((entry) => entry.name);

test('a place shows every project, those in no folder, or one folder’s, the latest first', () => {
  const { index, game } = cast();

  assert.deepEqual(names(projectsIn(index, { place: EVERY_PROJECT })), [
    'Rival',
    'Grass',
    'Hero',
    'spark',
  ]);
  assert.deepEqual(names(projectsIn(index, { place: NO_FOLDER })), ['spark']);
  assert.deepEqual(names(projectsIn(index, { place: game.id })), ['Rival', 'Hero']);
});

test('projects sort by name whatever their case, and the list itself keeps its order', () => {
  const { index } = cast();

  assert.deepEqual(names(projectsIn(index, { sort: 'name' })), ['Grass', 'Hero', 'Rival', 'spark']);
  assert.deepEqual(names(index.list), ['Hero', 'Rival', 'Grass', 'spark']);
});

test('a search looks through every folder, by name, kind or folder name, every word', () => {
  const { index, tiles } = cast();
  const found = (query) => names(projectsIn(index, { place: tiles.id, query }));

  assert.deepEqual(found('riv'), ['Rival']);
  assert.deepEqual(found('NAGA'), ['Rival', 'Hero']);
  assert.deepEqual(found('naga her'), ['Hero']);
  assert.deepEqual(found('effect'), ['spark']);
  assert.deepEqual(found('   '), ['Grass']);
  assert.deepEqual(found('nobody'), []);
});

test('folders come in name order, numbers counted as numbers', () => {
  const { index } = cast();

  assert.deepEqual(names(foldersByName(index)), ['Naga Eleven', 'Tiles 9', 'Tiles 10']);
});

test('a search keeps the folders named so or holding what it found', () => {
  const { index } = cast();

  assert.deepEqual(names(foldersMatching(index, 'hero')), ['Naga Eleven']);
  assert.deepEqual(names(foldersMatching(index, 'tiles')), ['Tiles 9', 'Tiles 10']);
  assert.deepEqual(names(foldersMatching(index, '')), ['Naga Eleven', 'Tiles 9', 'Tiles 10']);
});

test('each place counts its projects; one whose folder is gone counts in none', () => {
  const { index, game, tiles } = cast();

  index.list[3].folder = 'gone';
  const counts = countsByPlace(index);

  assert.equal(counts.get(EVERY_PROJECT), 4);
  assert.equal(counts.get(NO_FOLDER), 1);
  assert.equal(counts.get(game.id), 2);
  assert.equal(counts.get(tiles.id), 1);
});

test('a folder deleted while it was open falls back to every project', () => {
  const { index, game } = cast();

  assert.equal(knownPlace(index, game.id), game.id);
  assert.equal(knownPlace(index, NO_FOLDER), NO_FOLDER);
  removeFolder(index, game.id);
  assert.equal(knownPlace(index, game.id), EVERY_PROJECT);
});
