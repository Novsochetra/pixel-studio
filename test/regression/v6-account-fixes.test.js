import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { projectStructure } from '../../src/store/load.js';
import { keysFor } from '../../src/store/keys.js';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }

  return value;
}

// claude.ai's store, which hands every document back frozen
function frozenAccount(docs) {
  const snap = (id) => ({
    id,
    exists: id in docs,
    data: () => deepFreeze(structuredClone(docs[id])),
  });
  const collection = {
    get: async () => ({ docs: Object.keys(docs).map(snap) }),
    doc: (id) => ({
      get: async () => snap(id),
      set: async (data) => {
        docs[id] = structuredClone(data);
      },
      delete: async () => {
        delete docs[id];
      },
    }),
  };

  return {
    use: async (name) =>
      ({ db: { collection: () => collection }, user: { id: async () => 'me' } })[name] ?? null,
  };
}

// on claude.ai the page stopped at "Cannot assign to read only property '0' of object
// '[object Array]'": it changed the saved projects list and project in place, which come frozen
test('saved work from claude.ai opens, though the store hands it back frozen', async () => {
  const { openBackend } = await import('../../src/store/backends.js');
  const { readIndex, upsertEntry } = await import('../../src/store/projects.js');
  const { firstProject } = await import('../../src/ui/boot-project.js');
  const project = newProject({ name: 'Hero' });
  const prefix = `p-${project.id}-`;
  const docs = {
    projects: {
      list: [{ id: project.id, name: 'Hero', prefix, updatedAt: 0 }],
      current: project.id,
    },
    [keysFor(prefix).project]: { json: JSON.stringify(projectStructure(project)) },
  };
  globalThis.window = { claude: frozenAccount(docs) };

  const backend = await openBackend();
  const index = await readIndex(backend);
  const opened = await firstProject(backend, index);
  upsertEntry(index, { ...opened.project, name: 'Hero 2' }, prefix);

  assert.equal(backend.kind, 'account');
  assert.equal(opened.project.name, 'Hero');
  assert.equal(index.list[0].name, 'Hero 2');
  delete globalThis.window;
});
