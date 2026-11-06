import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { insideLoop, lassoOwners } from '../../src/model/body/lasso.js';
import { BODY_PARTS } from '../../src/model/kinds.js';
import { planFromTemplate } from '../../src/model/body/cut-plan.js';
import { frontSprite } from './body-helpers.js';

const square = [
  [10, 10],
  [20, 10],
  [20, 20],
  [10, 20],
];

test('a point is inside a loop when its middle is, whatever way the loop was drawn', () => {
  assert.ok(insideLoop(square, [15, 15]));
  assert.ok(!insideLoop(square, [25, 15]));
  assert.ok(insideLoop([...square].reverse(), [10.5, 19.5]));
});

test('the lasso gives the art inside it to the part picked, and only art', () => {
  const source = frontSprite();
  const plan = planFromTemplate(source, BODY_PARTS);
  const head = BODY_PARTS.findIndex((part) => part.id === 'head');
  const aroundTheLeftFist = [
    [50, 80],
    [64, 80],
    [64, 96],
    [50, 96],
  ];
  const taken = lassoOwners(plan, { source, loop: aroundTheLeftFist, index: head });

  assert.ok(taken > 50, `${taken} pixels`);
  assert.equal(plan.owners[88 * 160 + 58], head);
  assert.equal(plan.owners[81 * 160 + 51], -1, 'a clear pixel inside stays clear');
});

test('a lasso of fewer than three points takes nothing', () => {
  const source = frontSprite();
  const plan = planFromTemplate(source, BODY_PARTS);

  assert.equal(
    lassoOwners(plan, {
      source,
      loop: [
        [1, 1],
        [9, 9],
      ],
      index: 0,
    }),
    0,
  );
});
