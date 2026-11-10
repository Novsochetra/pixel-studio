import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newFrame, newLayer } from '../../src/model/project.js';
import { bounds, getPixel, pack, setPixel, CLEAR } from '../../src/model/sprite.js';
import {
  clampLayersShift,
  clampShift,
  shiftFrame,
  shiftLayer,
} from '../../src/model/frame-shift.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);
const SIZE = 20;
const CANVAS = { width: SIZE, height: SIZE };

function frameWith([x, y], kind = 'art') {
  const layer = newLayer(SIZE, SIZE, { name: 'Art', kind });

  setPixel(layer.sprite, x, y, RED);

  return newFrame(SIZE, SIZE, [layer]);
}

function addTopLayer(frame, [x, y]) {
  const top = newLayer(SIZE, SIZE, { name: 'Top' });

  setPixel(top.sprite, x, y, BLUE);
  frame.layers.push(top);
}

test('a shift moves the pixel by exactly that much, in every direction', () => {
  const shifts = [
    [3, 2],
    [-3, -2],
    [3, -2],
    [-3, 2],
    [0, 4],
    [4, 0],
  ];

  for (const [dx, dy] of shifts) {
    const frame = frameWith([10, 10]);

    shiftFrame(frame, [dx, dy]);
    const box = { left: 10 + dx, top: 10 + dy, right: 11 + dx, bottom: 11 + dy };

    assert.equal(getPixel(frame.layers[0].sprite, 10 + dx, 10 + dy), RED);
    assert.deepEqual(bounds(frame.layers[0].sprite), box);
  }
});

test('every layer and pin moves together', () => {
  const frame = frameWith([5, 5]);

  addTopLayer(frame, [6, 7]);
  frame.marks = [{ name: 'Hip', x: 8, y: 9 }];
  shiftFrame(frame, [2, 1]);

  assert.equal(getPixel(frame.layers[0].sprite, 7, 6), RED);
  assert.equal(getPixel(frame.layers[1].sprite, 8, 8), BLUE);
  assert.deepEqual(frame.marks, [{ name: 'Hip', x: 10, y: 10 }]);
  assert.equal(getPixel(frame.layers[0].sprite, 5, 5), CLEAR);
});

test('a move inside the canvas is left alone', () => {
  assert.deepEqual(clampShift(frameWith([10, 10]), CANVAS, [3, -4]), [3, -4]);
});

test('a move stops at the canvas edge, each way', () => {
  const frame = frameWith([10, 10]);

  assert.deepEqual(clampShift(frame, CANVAS, [50, 50]), [9, 9]);
  assert.deepEqual(clampShift(frame, CANVAS, [-50, -50]), [-10, -10]);
});

test('the edge counts the art of all layers together', () => {
  const frame = frameWith([2, 10]);

  addTopLayer(frame, [17, 10]);

  assert.deepEqual(clampShift(frame, CANVAS, [50, 0]), [2, 0]);
  assert.deepEqual(clampShift(frame, CANVAS, [-50, 0]), [-2, 0]);
});

test('a picture to trace does not stop a move', () => {
  assert.deepEqual(clampShift(frameWith([19, 19], 'reference'), CANVAS, [5, 5]), [5, 5]);
});

test('a layer moves alone: the other layers and the pins stay', () => {
  const frame = frameWith([5, 5]);

  addTopLayer(frame, [6, 7]);
  frame.marks = [{ name: 'Hip', x: 8, y: 9 }];
  shiftLayer(frame.layers[1], [2, 1]);

  assert.equal(getPixel(frame.layers[1].sprite, 8, 8), BLUE);
  assert.equal(getPixel(frame.layers[1].sprite, 6, 7), CLEAR);
  assert.equal(getPixel(frame.layers[0].sprite, 5, 5), RED);
  assert.deepEqual(frame.marks, [{ name: 'Hip', x: 8, y: 9 }]);
});

test('a posed layer takes its pose with it, so its next pose is drawn where it stands', () => {
  const [layer] = frameWith([5, 5]).layers;

  layer.pose = { x: 1, y: 2 };
  shiftLayer(layer, [3, 4]);

  assert.deepEqual(layer.pose, { x: 4, y: 6 });
});

test('a layer stops at the canvas edge by its own art, not the art of other layers', () => {
  const frame = frameWith([2, 10]);

  addTopLayer(frame, [17, 10]);

  assert.deepEqual(clampLayersShift([frame.layers[0]], CANVAS, [50, 0]), [17, 0]);
  assert.deepEqual(clampLayersShift([frame.layers[1]], CANVAS, [50, 0]), [2, 0]);
  assert.deepEqual(clampLayersShift([frame.layers[1]], CANVAS, [-50, 0]), [-17, 0]);
});

test('a picture to trace and an empty layer are not stopped at the edge', () => {
  const [picture] = frameWith([19, 19], 'reference').layers;
  const empty = newLayer(SIZE, SIZE, { name: 'Empty' });

  assert.deepEqual(clampLayersShift([picture], CANVAS, [5, 5]), [5, 5]);
  assert.deepEqual(clampLayersShift([empty], CANVAS, [50, 50]), [50, 50]);
});

test('layers moved together stop at the edge as one, so the gap between them stays', () => {
  const frame = frameWith([2, 10]);

  addTopLayer(frame, [17, 10]);

  assert.deepEqual(clampLayersShift(frame.layers, CANVAS, [50, 0]), [2, 0]);
  assert.deepEqual(clampLayersShift(frame.layers, CANVAS, [-50, 0]), [-2, 0]);
});
