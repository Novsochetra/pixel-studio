import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  dropLeftUnsaved,
  keepLeftUnsaved,
  restoreLeftUnsaved,
} from '../../src/store/left-unsaved.js';

function storageOf(limit = Infinity) {
  const kept = new Map();

  return {
    kept,
    getItem: (key) => kept.get(key) ?? null,
    setItem(key, value) {
      if (value.length > limit) {
        throw new Error('full');
      }

      kept.set(key, value);
    },
    removeItem: (key) => kept.delete(key),
  };
}

function backendOf(docs = {}, kind = 'browser') {
  return {
    kind,
    docs,
    read: async (key) => docs[key] ?? null,
    async write(key, data) {
      docs[key] = data;
    },
  };
}

const stroke = [
  ['p-1-layer-a', { png: 'data:the-stroke' }],
  ['p-1-project', { json: '{}', savedAt: 5 }],
];

test('work left unsaved is put into the saved work on the next visit, once', async () => {
  const storage = storageOf();
  const backend = backendOf({ 'p-1-project': { json: '{}', savedAt: 1 } });

  keepLeftUnsaved(storage, { kind: 'browser', docs: stroke });
  assert.equal(await restoreLeftUnsaved(storage, backend), true);
  assert.equal(backend.docs['p-1-layer-a'].png, 'data:the-stroke');
  assert.equal(storage.kept.size, 0, 'and is kept no longer');
  assert.equal(await restoreLeftUnsaved(storage, backend), false);
});

test('a save that did land, or a later one, is not written over', async () => {
  const storage = storageOf();
  const later = { json: '{"newer":true}', savedAt: Date.now() + 60000 };
  const backend = backendOf({ 'p-1-project': later, 'p-1-layer-a': { png: 'data:newer' } });

  keepLeftUnsaved(storage, { kind: 'browser', docs: stroke });
  assert.equal(await restoreLeftUnsaved(storage, backend), false);
  assert.equal(backend.docs['p-1-layer-a'].png, 'data:newer');
  assert.equal(storage.kept.size, 0);
});

test('what was drawn signed out is not written into an account’s work', async () => {
  const storage = storageOf();
  const backend = backendOf({}, 'account');

  keepLeftUnsaved(storage, { kind: 'browser', docs: stroke });
  assert.equal(await restoreLeftUnsaved(storage, backend), false);
  assert.deepEqual(backend.docs, {});
});

test('nothing to write keeps what was kept before, and a full store keeps nothing', () => {
  const storage = storageOf();

  keepLeftUnsaved(storage, { kind: 'browser', docs: stroke });
  keepLeftUnsaved(storage, { kind: 'browser', docs: [] });
  assert.equal(storage.kept.size, 1, 'a second leaving with nothing new lets the first stand');

  const full = storageOf(10);

  keepLeftUnsaved(full, { kind: 'browser', docs: stroke });
  assert.equal(full.kept.size, 0);
});

test('a browser with no store of its own keeps nothing and fails nothing', async () => {
  keepLeftUnsaved(null, { kind: 'browser', docs: stroke });
  dropLeftUnsaved(null);
  assert.equal(await restoreLeftUnsaved(null, backendOf()), false);
});

test('what was kept and cannot be read is let go', async () => {
  const storage = storageOf();

  storage.setItem('pixel-clean-left-unsaved', '{not json');
  assert.equal(await restoreLeftUnsaved(storage, backendOf()), false);
  assert.equal(storage.kept.size, 0);
});
