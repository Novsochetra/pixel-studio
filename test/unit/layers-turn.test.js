import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  applyLayersTurn,
  layersHandle,
  liveLayersTurn,
  startLayersTurn,
} from '../../src/editor/layers-turn.js';
import { newLayer } from '../../src/model/project.js';
import {
  cloneSprite,
  getPixel,
  pack,
  samePixels,
  setPixel,
  CLEAR,
} from '../../src/model/sprite.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);
const SIZE = 40;
const CANVAS = { width: SIZE, height: SIZE };

function layerWith(color, points) {
  const layer = newLayer(SIZE, SIZE, { name: 'Art' });

  points.forEach(([x, y]) => setPixel(layer.sprite, x, y, color));

  return layer;
}

const bar = () => {
  const points = [];

  for (let y = 16; y < 24; y++) {
    points.push([19, y], [20, y]);
  }

  return layerWith(RED, points);
};

test('a quarter turn moves whole pixels, about the middle of the art', () => {
  const layer = bar();

  applyLayersTurn([layer], startLayersTurn([layer]), 90);

  assert.equal(getPixel(layer.sprite, 16, 19), RED);
  assert.equal(getPixel(layer.sprite, 23, 20), RED);
  assert.equal(getPixel(layer.sprite, 20, 16), CLEAR, 'the pixels left where they were');
});

test('layers picked together turn about the middle of all their art', () => {
  const left = layerWith(RED, [[10, 20]]);
  const right = layerWith(BLUE, [[29, 19]]);

  applyLayersTurn([left, right], startLayersTurn([left, right]), 180);

  assert.equal(getPixel(left.sprite, 29, 19), RED);
  assert.equal(getPixel(right.sprite, 10, 20), BLUE);
});

test('turning on and back brings every pixel back, with nothing worn away', () => {
  const layer = bar();
  const first = cloneSprite(layer.sprite);
  const turn = startLayersTurn([layer]);
  const turned = [33, 71, 120].reduce(
    (current, angle) => applyLayersTurn([layer], current, angle),
    turn,
  );

  assert.ok(!samePixels(layer.sprite, first));
  applyLayersTurn([layer], turned, 0);
  assert.ok(samePixels(layer.sprite, first));
});

test('a layer with no art beside one with art stays empty', () => {
  const layer = bar();
  const empty = layerWith(RED, []);

  applyLayersTurn([layer, empty], startLayersTurn([layer, empty]), 30);

  assert.ok(empty.sprite.pixels.every((value) => value === 0));
});

test('no art has no turn and no handle', () => {
  const empty = layerWith(RED, []);

  assert.equal(startLayersTurn([empty]), null);
  assert.equal(startLayersTurn([]), null);
  assert.equal(layersHandle([empty], null, { canvas: CANVAS, gap: 5 }), null);
});

test('a turn goes on until an edit, and only over the same layers', () => {
  const layer = bar();
  const other = bar();

  assert.equal(liveLayersTurn(startLayersTurn([layer]), [layer]), null, 'nothing turned yet');

  const turn = applyLayersTurn([layer], startLayersTurn([layer]), 30);

  assert.equal(liveLayersTurn(turn, [layer]), turn);
  assert.equal(liveLayersTurn(turn, [other]), null);
  assert.equal(liveLayersTurn(turn, [layer, other]), null);

  setPixel(layer.sprite, 1, 1, BLUE);
  assert.equal(liveLayersTurn(turn, [layer]), null);
});

test('the handle stands above the art and turns with it', () => {
  const layer = bar();
  const upright = layersHandle([layer], null, { canvas: CANVAS, gap: 5 });

  assert.deepEqual(upright.root, [20, 16]);
  assert.deepEqual(upright.knob, [20, 11]);

  const turn = applyLayersTurn([layer], startLayersTurn([layer]), 90);
  const turned = layersHandle([layer], turn, { canvas: CANVAS, gap: 5 });

  assert.ok(Math.abs(turned.knob[0] - 29) < 1e-9);
  assert.ok(Math.abs(turned.knob[1] - 20) < 1e-9);
});

test('near an edge the handle stays on the canvas', () => {
  const layer = layerWith(RED, [[20, 1]]);
  const { knob } = layersHandle([layer], null, { canvas: CANVAS, gap: 5 });

  assert.deepEqual(knob, [20.5, 0.5]);
});
