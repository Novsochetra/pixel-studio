import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { oneAtATime, readEvents, touchesProject } from '../../src/store/server-changes.js';

test('a change reaches the open project only through its own documents', () => {
  const change = (...keys) => ({ by: 'tool', keys });

  assert.ok(touchesProject(change('p-a-layer-l1'), 'p-a-'));
  assert.ok(touchesProject(change('projects', 'p-a-project'), 'p-a-'));
  assert.ok(!touchesProject(change('p-b-layer-l1', 'p-b-project'), 'p-a-'));
  assert.ok(!touchesProject(change('projects', 'p-a-portrait'), 'p-a-'));
});

test('the first project, with no prefix, is not changed by another’s documents', () => {
  assert.ok(touchesProject({ keys: ['layer-l1'] }, ''));
  assert.ok(touchesProject({ keys: ['project'] }, ''));
  assert.ok(!touchesProject({ keys: ['projects'] }, ''));
  assert.ok(!touchesProject({ keys: ['p-a-layer-l1', 'p-a-project'] }, ''));
  assert.ok(!touchesProject(null, ''));
});

test('changes heard while a run is under way are taken by one more run, not one each', async () => {
  let runs = 0;
  let letGo = () => {};
  const take = oneAtATime(async () => {
    runs += 1;

    if (runs === 1) {
      await new Promise((done) => {
        letGo = done;
      });
    }
  });

  const first = take();

  take();
  take();
  take();
  letGo();
  await first;

  assert.equal(runs, 2);
  await take();
  assert.equal(runs, 3);
});

test('a run that fails lets the next change start a run again', async () => {
  let runs = 0;
  const take = oneAtATime(async () => {
    runs += 1;
    throw new Error('the server did not answer');
  });

  await assert.rejects(take());
  await assert.rejects(take());
  assert.equal(runs, 2);
});

test('a change split across two pieces of the stream is read once it is whole', () => {
  const first = readEvents('retry: 3000\n\ndata: {"by":"tool","keys":["p-a-proj');

  assert.deepEqual(first.changes, []);

  const second = readEvents(`${first.rest}ect"]}\n\n: still here\n\ndata: {"by":"tool"`);

  assert.deepEqual(second.changes, [{ by: 'tool', keys: ['p-a-project'] }]);
  assert.equal(second.rest, 'data: {"by":"tool"');
});

test('a line that is no change is passed over', () => {
  assert.deepEqual(readEvents('data: not json\n\ndata: {"by":"tool"}\n\n').changes, [
    { by: 'tool' },
  ]);
});
