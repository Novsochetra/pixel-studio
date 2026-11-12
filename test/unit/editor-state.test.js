import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createStore } from '../../src/ui/store.js';

test('changes made together are told once, with every part of them', () => {
  const store = createStore({ tool: 'pencil' });
  const told = [];

  store.subscribe((state, patch) => told.push({ ...patch }));
  store.together(() => {
    store.set({ tool: 'pose' });
    store.together(() => store.touch('animations'));
    store.set({ piece: null });
  });

  assert.deepEqual(told, [{ tool: 'pose', animations: true, piece: null }]);
  assert.equal(store.state.tool, 'pose');
});

test('alone, each change is told as it is made', () => {
  const store = createStore({});
  let told = 0;

  store.subscribe(() => told++);
  store.set({ tool: 'pose' });
  store.touch();
  store.together(() => {});

  assert.equal(told, 2);
});
