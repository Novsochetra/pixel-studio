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
