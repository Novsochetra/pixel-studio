import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { keepStep, newSteps, planCopy, stepBack, stepOn } from '../../src/model/body/cut-steps.js';

const planOf = (owners) => ({
  parts: [
    { id: 'a', name: 'Body', parent: null, pivot: null },
    { id: 'b', name: 'Arm', parent: 'a', pivot: null },
  ],
  owners: Int16Array.from(owners),
});

function changed(steps, plan, edit) {
  const before = planCopy(plan);

  edit(plan);

  return keepStep(steps, before, plan);
}

test('a stroke in the cut window is taken back, and made again', () => {
  const steps = newSteps();
  let plan = planOf([0, 0, -1, -1]);

  assert.equal(
    changed(steps, plan, (now) => (now.owners[2] = 1)),
    true,
  );
  assert.equal(
    changed(steps, plan, (now) => (now.parts[1].name = 'Left arm')),
    true,
  );

  plan = stepBack(steps, plan);
  assert.equal(plan.parts[1].name, 'Arm');
  assert.deepEqual([...plan.owners], [0, 0, 1, -1]);

  plan = stepBack(steps, plan);
  assert.deepEqual([...plan.owners], [0, 0, -1, -1]);
  assert.equal(stepBack(steps, plan), plan, 'with nothing earlier the plan stays');

  plan = stepOn(steps, stepOn(steps, plan));
  assert.equal(plan.parts[1].name, 'Left arm');
  assert.deepEqual([...plan.owners], [0, 0, 1, -1]);
});

test('picking a tool or a part, which changes nothing cut, is no step', () => {
  const steps = newSteps();
  const plan = planOf([0, 0, -1, -1]);

  assert.equal(
    changed(steps, plan, () => {}),
    false,
  );
  assert.equal(steps.back.length, 0);
});

test('a change after going back leaves nothing to make again', () => {
  const steps = newSteps();
  let plan = planOf([0, 0, -1, -1]);

  changed(steps, plan, (now) => (now.owners[3] = 1));
  plan = stepBack(steps, plan);
  changed(steps, plan, (now) => (now.owners[2] = 0));

  assert.equal(steps.on.length, 0);
  assert.equal(stepOn(steps, plan), plan);
});
