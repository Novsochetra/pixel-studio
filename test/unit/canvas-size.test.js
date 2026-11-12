import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CLEAR, createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { newProject } from '../../src/model/new-project.js';
import { setPin } from '../../src/model/pins.js';
import { canvasShift, placedSprite, withCanvasSize } from '../../src/model/canvas-size.js';
import { duplicateAnimation } from '../../src/model/animations.js';
import { bodyOf } from '../../src/model/body/body-kind.js';
import { renderBody, restPose } from '../../src/model/body/rig.js';
import { bounds, samePixels } from '../../src/model/sprite.js';
import { cutCharacter } from './body-helpers.js';

const RED = pack(255, 0, 0);
const BOTTOM = { x: 0.5, y: 1 };
const TOP_LEFT = { x: 0, y: 0 };

test('the anchor says which sides the new room is added to', () => {
  const from = { width: 16, height: 16 };

  assert.deepEqual(canvasShift(from, { width: 32, height: 24 }, TOP_LEFT), [0, 0]);
  assert.deepEqual(canvasShift(from, { width: 32, height: 24 }, BOTTOM), [8, 8]);
  assert.deepEqual(canvasShift(from, { width: 8, height: 8 }, { x: 1, y: 0.5 }), [-8, -4]);
});

test('a sprite placed on a bigger canvas keeps every pixel, moved with the anchor', () => {
  const sprite = createSprite(4, 4);

  setPixel(sprite, 0, 0, RED);
  setPixel(sprite, 3, 3, RED);
  const placed = placedSprite(sprite, { width: 8, height: 6 }, [4, 2]);

  assert.equal(placed.width, 8);
  assert.equal(placed.height, 6);
  assert.equal(getPixel(placed, 4, 2), RED);
  assert.equal(getPixel(placed, 7, 5), RED);
  assert.equal(getPixel(placed, 0, 0), CLEAR);
});

test('a smaller canvas cuts off what falls outside it and nothing else', () => {
  const sprite = createSprite(4, 4);

  setPixel(sprite, 0, 0, RED);
  setPixel(sprite, 3, 3, RED);
  const placed = placedSprite(sprite, { width: 2, height: 2 }, [-2, -2]);

  assert.equal(getPixel(placed, 1, 1), RED);
  assert.equal(getPixel(placed, 0, 0), CLEAR);
});

test('a project on a new canvas moves its art, pins and guide lines together', () => {
  const project = newProject({ kind: 'character', width: 16, height: 16 });
  const frame = Object.values(project.animations[0].directions)[0].frames[0];
  const feet = project.guides[0].row;

  setPixel(frame.layers[0].sprite, 8, 15, RED);
  setPin(frame, 'Head', 8, 2);
  const bigger = withCanvasSize(project, { width: 32, height: 24 }, BOTTOM);
  const moved = Object.values(bigger.animations[0].directions)[0].frames[0];

  assert.deepEqual(
    { width: bigger.canvas.width, height: bigger.canvas.height, scale: bigger.canvas.scale },
    { width: 32, height: 24, scale: project.canvas.scale },
  );
  assert.equal(getPixel(moved.layers[0].sprite, 16, 23), RED, 'the art stands on the same ground');
  assert.deepEqual(moved.marks, [{ name: 'Head', x: 16, y: 10 }]);
  assert.equal(bigger.guides[0].row, feet + 8);
  assert.equal(project.canvas.width, 16, 'the project given is left as it was');
  assert.equal(getPixel(frame.layers[0].sprite, 8, 15), RED);
});

test('every layer of every frame and animation gets the new size', () => {
  const project = newProject({ kind: 'character', width: 16, height: 16 });
  const resized = withCanvasSize(project, { width: 20, height: 12 }, TOP_LEFT);
  const sizes = new Set();

  for (const animation of resized.animations) {
    for (const entry of Object.values(animation.directions)) {
      entry.frames.forEach((frame) =>
        frame.layers.forEach((layer) => sizes.add(`${layer.sprite.width}x${layer.sprite.height}`)),
      );
    }
  }

  assert.deepEqual([...sizes], ['20x12']);
});

test('a character cut into parts keeps its cut: the parts move, and a new pose lines up', () => {
  const { project, animation } = cutCharacter();

  duplicateAnimation(project, animation);
  const before = bounds(bodyOf(animation.directions.south.frames[0]).sprite);
  const bigger = withCanvasSize(project, { width: 200, height: 180 }, BOTTOM);
  const [first, copy] = bigger.animations;
  const body = bodyOf(first.directions.south.frames[0]);
  const after = bounds(body.sprite);

  assert.deepEqual(
    [after.left, after.top, after.right, after.bottom],
    [before.left + 20, before.top + 20, before.right + 20, before.bottom + 20],
  );
  assert.deepEqual(body.pose, restPose(), 'the pose is as it was: the parts themselves moved');
  assert.ok(
    samePixels(body.sprite, renderBody(first.directions.south.rig, restPose(), bigger.canvas)),
    'a frame posed afresh from the cut stands where this one does',
  );
  assert.equal(
    first.directions.south.rig,
    copy.directions.south.rig,
    'animations that shared the cut still share it',
  );
});

// a canvas made smaller left a Head pin at y −20: not to be seen, nor taken hold of
test('a pin the smaller canvas has no room for stands at its nearest edge', () => {
  const project = newProject({ kind: 'character', width: 160, height: 160 });

  project.animations[0].directions.south.frames[0].marks = [{ name: 'Head', x: 78, y: 40 }];
  const smaller = withCanvasSize(project, { width: 100, height: 100 }, { x: 0.5, y: 1 });
  const [pin] = smaller.animations[0].directions.south.frames[0].marks;

  assert.deepEqual([pin.x, pin.y], [48, 0]);
});
