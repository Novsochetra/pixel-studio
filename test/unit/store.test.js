import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { keysFor, prefixFor } from '../../src/store/keys.js';
import { upsertEntry } from '../../src/store/projects.js';

// versions.js reaches PNG encoding through project-file.js; give it a stand-in for the browser
globalThis.document = {
  createElement: () => ({
    getContext: () => ({ putImageData() {}, drawImage() {} }),
    toDataURL: () => `data:image/png;base64,${'A'.repeat(300000)}`,
  }),
};
globalThis.ImageData = class {
  constructor(data, width, height) {
    Object.assign(this, { data, w: width, h: height });
  }
};

const { saveVersion, listVersions, versionText, deleteVersion } =
  await import('../../src/store/versions.js');
const { newProject } = await import('../../src/model/new-project.js');

function memory() {
  const docs = new Map();

  return {
    docs,
    read: async (key) => docs.get(key) ?? null,
    write: async (key, value) => docs.set(key, value),
    remove: async (key) => docs.delete(key),
  };
}

test('a version too big for one stored document is split and joined back exactly', async () => {
  const backend = memory();
  const project = newProject({ name: 'Sochetra' });

  await saveVersion(backend, project, 'first');
  const [entry] = await listVersions(backend);
  assert.ok(entry.chunks > 1);
  assert.ok([...backend.docs.values()].every((doc) => JSON.stringify(doc).length < 256 * 1024));
  const text = await versionText(backend, entry);
  assert.equal(text.length, entry.size);
  assert.equal(JSON.parse(text).project.name, 'Sochetra');
  await deleteVersion(backend, entry.id);
  assert.equal((await listVersions(backend)).length, 0);
  assert.equal([...backend.docs.keys()].filter((key) => key.startsWith('version-')).length, 0);
});

// from the projects list
test('projects keep their documents apart, and the list follows renames', () => {
  assert.equal(keysFor('').project, 'project');
  assert.equal(keysFor(prefixFor('abc')).layer('l1'), 'p-abc-layer-l1');
  const index = { list: [], current: null };
  const project = newProject({ name: 'Knight', profile: 'generic' });
  assert.equal(upsertEntry(index, project, 'p-x-'), true);
  assert.equal(upsertEntry(index, project, 'p-x-'), false);
  project.name = 'Dark knight';
  assert.equal(upsertEntry(index, project, 'p-x-'), true);
  assert.equal(index.list[0].name, 'Dark knight');
  assert.equal(index.list[0].prefix, 'p-x-');
});

test('shortcuts name ⌘ on a Mac and Ctrl elsewhere', async () => {
  const { keyNames } = await import('../../src/ui/platform-keys.js');

  assert.equal(keyNames('Redo (⇧⌘Z or ⌘Y)', true), 'Redo (⇧⌘Z or ⌘Y)');
  assert.equal(keyNames('Redo (⇧⌘Z or ⌘Y)', false), 'Redo (Ctrl+Shift+Z or Ctrl+Y)');
});

// "Before Cambodia home" kept twice was two rows of one name in History
test('a version named as an earlier one is numbered', async () => {
  const backend = memory();
  const project = newProject({ name: 'Hero' });

  await saveVersion(backend, project, 'Before the kit');
  await saveVersion(backend, project, 'Before the kit');
  await saveVersion(backend, project, 'Another');

  assert.deepEqual(
    (await listVersions(backend)).map((version) => version.name),
    ['Another', 'Before the kit 2', 'Before the kit'],
  );
});

// thirty versions kept before cleanings and resizes pushed out one named and saved by hand
test('versions saved by hand are the last to go past the limit', async () => {
  const { versionsKept } = await import('../../src/store/versions.js');
  const auto = (i) => ({ id: `a${i}`, name: `Before ${i}`, byHand: false });
  const mine = { id: 'mine', name: 'My final art', byHand: true };
  const list = [
    ...Array.from({ length: 20 }, (_, i) => auto(i)),
    mine,
    ...Array.from({ length: 10 }, (_, i) => auto(20 + i)),
  ];
  const { kept, gone } = versionsKept(list);

  assert.equal(kept.length, 30);
  assert.ok(kept.includes(mine), 'the one saved by hand stays');
  assert.deepEqual(
    gone.map((version) => version.id),
    ['a29'],
    'the oldest kept on its own goes',
  );

  const allMine = Array.from({ length: 31 }, (_, i) => ({ id: `m${i}`, byHand: true }));

  assert.deepEqual(
    versionsKept(allMine).gone.map((version) => version.id),
    ['m30'],
    'with none kept on their own, the oldest goes',
  );
});

// Chest, then Hero, then Grass edited within a minute: Recent listed Grass, Chest, Hero
test('a project edited after another moves up the list at once', async () => {
  const chest = { ...newProject({ name: 'Chest' }), id: 'chest' };
  const hero = { ...newProject({ name: 'Hero' }), id: 'hero' };
  const index = { list: [] };
  const recent = () =>
    [...index.list]
      .sort((one, other) => other.updatedAt - one.updatedAt)
      .map((entry) => entry.name);

  const later = () => new Promise((done) => setTimeout(done, 5));

  upsertEntry(index, hero, 'p-hero-');
  await later();
  upsertEntry(index, chest, 'p-chest-');
  await later();
  const said = upsertEntry(index, hero, 'p-hero-');

  assert.equal(said, true, 'the list is to be written again');
  assert.deepEqual(recent(), ['Hero', 'Chest']);
  assert.equal(upsertEntry(index, hero, 'p-hero-'), false, 'the same project again, not yet');
});
