import { strict as assert } from 'node:assert';
import { test } from 'node:test';

// versions.js reaches PNG encoding through project-file.js; give it a stand-in for the browser
globalThis.document = { createElement: () => ({ getContext: () => ({ putImageData() {}, drawImage() {} }), toDataURL: () => 'data:image/png;base64,' + 'A'.repeat(300000) }) };
globalThis.ImageData = class { constructor(data, w, h) { Object.assign(this, { data, w, h }); } };

const { saveVersion, listVersions, versionText, deleteVersion } = await import('../src/store/versions.js');
const { newProject } = await import('../src/model/project.js');

function memory() {
  const docs = new Map();

  return { docs, read: async (k) => docs.get(k) ?? null, write: async (k, v) => docs.set(k, v), remove: async (k) => docs.delete(k) };
}

test('a version too big for one stored document is split and joined back exactly', async () => {
  const backend = memory();
  const project = newProject();
  await saveVersion(backend, project, 'first');
  const [entry] = await listVersions(backend);
  assert.ok(entry.chunks > 1);
  assert.ok([...backend.docs.values()].every((doc) => JSON.stringify(doc).length < 256 * 1024));
  const text = await versionText(backend, entry);
  assert.equal(text.length, entry.size);
  assert.equal(JSON.parse(text).project.name, 'Sochetra');
  await deleteVersion(backend, entry.id);
  assert.equal((await listVersions(backend)).length, 0);
  assert.equal([...backend.docs.keys()].filter((k) => k.startsWith('version-')).length, 0);
});
