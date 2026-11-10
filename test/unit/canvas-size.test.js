import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CLEAR, createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { newProject } from '../../src/model/new-project.js';
import { setPin } from '../../src/model/pins.js';
import { canvasShift, placedSprite, withCanvasSize } from '../../src/model/canvas-size.js';

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
