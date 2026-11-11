import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { Saver } from '../../src/store/saver.js';
import { keysFor } from '../../src/store/keys.js';

const keys = keysFor('p-x-');

function saverOn(backend) {
  const project = newProject({ width: 8, height: 8 });
  const saver = new Saver(backend, () => {}, keys);

  saver.attach(project);
  saver.remember(project);

  return saver;
}

// A tab closed a moment after a stroke lost the stroke: the save begun as the page left wrote its
// documents one at a time, each after the one before was heard of, and a page that is gone hears
// nothing. Where the backend takes them together, a save asks for all of them in one go.
test('a save hands the backend its documents together where it can take them so', async () => {
  const calls = [];
  const saver = saverOn({
    async write() {
      throw new Error('one at a time');
    },
    async writeAll(docs) {
      calls.push(docs.map(([key]) => key));
    },
    async remove() {},
  });

  saver.markStructure();
  await saver.flushNow();

  assert.deepEqual(calls, [[keys.project]]);
  assert.equal(saver.failed, false);
  saver.detach();
});

test('a save with nothing to write asks the backend for nothing', async () => {
  const calls = [];
  const saver = saverOn({
    async writeAll(docs) {
      calls.push(docs);
    },
    async remove() {},
  });

  await saver.flush(saver.project);

  assert.deepEqual(calls, []);
  saver.detach();
});

test('documents that could not be written together stay waiting for the next save', async () => {
  let offline = true;
  const written = [];
  const saver = saverOn({
    async writeAll(docs) {
      if (offline) {
        throw new Error('offline');
      }

      written.push(...docs.map(([key]) => key));
    },
    async remove() {},
  });

  saver.markStructure();
  await saver.flushNow();
  assert.equal(saver.failed, true);

  offline = false;
  await saver.flushNow();
  assert.deepEqual(written, [keys.project]);
  assert.equal(saver.failed, false);
  saver.detach();
});

test('a backend that takes one document at a time is still written to in turn', async () => {
  const written = [];
  const saver = saverOn({
    async write(key) {
      written.push(key);
    },
    async remove() {},
  });

  saver.markStructure();
  await saver.flushNow();

  assert.deepEqual(written, [keys.project]);
  saver.detach();
});

// what the page keeps by another way as it is left: the save waiting, and one under way
test('a saver says what it would write now, without marking it written', async () => {
  let release = null;
  const saver = saverOn({
    writeAll: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    async remove() {},
  });

  assert.deepEqual(saver.waiting(), [], 'nothing changed, nothing waiting');

  saver.markStructure();
  assert.deepEqual(
    saver.waiting().map(([key]) => key),
    [keys.project],
  );
  assert.equal(saver.waiting().length, 1, 'asked twice, it is still waiting');

  const saving = saver.flushNow();

  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(
    saver.waiting().map(([key]) => key),
    [keys.project],
    'a save under way is not in the saved work yet',
  );
  release();
  await saving;
  assert.deepEqual(saver.waiting(), [], 'and once it lands nothing waits');
  saver.detach();
});
