import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { rectSelection } from '../../src/editor/selection.js';
import { applyTurn, liveTurn, startTurn, turnHandle } from '../../src/editor/selection-turn.js';
import { topLayerAt } from '../../src/model/layer-ops.js';
import {
  cloneSprite,
  createSprite,
  getPixel,
  pack,
  samePixels,
  setPixel,
} from '../../src/model/sprite.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);
const count = (selection) => selection.cells.reduce((sum, cell) => sum + cell, 0);

// a red bar, 2 × 8, with a blue pixel behind the place it turns to
function scene() {
  const sprite = createSprite(40, 40);

  for (let y = 16; y < 24; y++) {
    setPixel(sprite, 19, y, RED);
    setPixel(sprite, 20, y, RED);
  }

  setPixel(sprite, 5, 5, BLUE);

  return { sprite, selection: rectSelection(sprite, [19, 16], [20, 23]) };
}

test('a quarter turn moves whole pixels, about the middle of the selection', () => {
  const { sprite, selection } = scene();
  const turned = applyTurn(sprite, startTurn(sprite, selection), 90);

  assert.equal(getPixel(sprite, 16, 19), RED);
  assert.equal(getPixel(sprite, 23, 20), RED);
  assert.equal(getPixel(sprite, 19, 16), 0, 'the pixels left where they were');
  assert.equal(getPixel(sprite, 5, 5), BLUE, 'pixels outside the selection stay');
  assert.equal(count(turned), 16, 'the selection follows the pixels');
});

test('any angle is drawn in pixels of the art, with no new colours', () => {
  const { sprite, selection } = scene();

  applyTurn(sprite, startTurn(sprite, selection), 33);

  for (let i = 0; i < 1600; i++) {
    assert.ok([0, RED, BLUE].includes(getPixel(sprite, i % 40, Math.floor(i / 40))));
  }

  assert.equal(getPixel(sprite, 20, 20), RED, 'the middle stays');
});

test('turning many times and back gives the first pixels: nothing wears away', () => {
  const { sprite, selection } = scene();
  const first = cloneSprite(sprite);
  const turn = startTurn(sprite, selection);
  let latest = selection;

  for (const angle of [17, 33, 71, -40]) {
    latest = applyTurn(sprite, turn, angle);
  }

  applyTurn(sprite, latest.turn, 0);

  assert.ok(samePixels(sprite, first));
});

test('pixels turned past the canvas come back when turned back', () => {
  const sprite = createSprite(10, 10);

  for (let x = 0; x < 10; x++) {
    setPixel(sprite, x, 1, RED);
  }

  const first = cloneSprite(sprite);
  const turn = startTurn(sprite, rectSelection(sprite, [0, 1], [9, 1]));

  applyTurn(sprite, turn, 90);
  applyTurn(sprite, turn, 0);

  assert.ok(samePixels(sprite, first));
});

test('clear pixels in a selection leave what is under them when it lands', () => {
  const sprite = createSprite(20, 20);

  setPixel(sprite, 9, 5, RED);
  setPixel(sprite, 10, 10, BLUE);
  const selection = rectSelection(sprite, [9, 5], [9, 7]);

  applyTurn(sprite, startTurn(sprite, selection), 45);

  assert.equal(getPixel(sprite, 10, 10), BLUE);
});

test('a turn goes on only over the pixels it left', () => {
  const { sprite, selection } = scene();
  const turned = applyTurn(sprite, startTurn(sprite, selection), 30);

  assert.equal(liveTurn(turned, sprite).angle, 30);
  assert.equal(liveTurn(selection, sprite), null, 'a selection never turned has none');
  setPixel(sprite, 0, 0, BLUE);
  assert.equal(liveTurn(turned, sprite), null, 'a pixel drawn since ends it');
});

test('nothing selected is nothing to turn', () => {
  const sprite = createSprite(4, 4);
  const empty = { width: 4, height: 4, cells: new Uint8Array(16) };

  assert.equal(startTurn(sprite, empty), null);
  assert.equal(turnHandle(empty, sprite, 2), null);
});

test('the handle stands above the selection, goes round with it, and stays on the canvas', () => {
  const { sprite, selection } = scene();
  const at = (found) => found.knob.map((value) => Math.round(value));

  assert.deepEqual(at(turnHandle(selection, sprite, 4)), [20, 12]);

  const turned = applyTurn(sprite, startTurn(sprite, selection), 90);

  assert.deepEqual(at(turnHandle(turned, sprite, 4)), [28, 20]);

  const whole = rectSelection(sprite, [0, 0], [39, 39]);

  assert.equal(turnHandle(whole, sprite, 4).knob[1], 0.5);
});

test('the layer picked at a point is the top one showing a pixel there', () => {
  const layer = (name, x, more = {}) => {
    const sprite = createSprite(4, 4);

    setPixel(sprite, x, 0, RED);

    return { name, sprite, kind: 'art', visible: true, ...more };
  };
  const layers = [
    layer('Trace', 3, { kind: 'reference' }),
    layer('Art', 0),
    layer('Hair', 0),
    layer('Hidden', 1, { visible: false }),
    { name: 'No sprite', kind: 'art', visible: true, sprite: null },
  ];
  const found = (point) => topLayerAt({ layers }, point)?.name ?? null;

  assert.equal(found([0, 0]), 'Hair');
  assert.equal(found([1, 0]), null, 'a hidden layer is not picked');
  assert.equal(found([3, 0]), null, 'a picture to trace is not art');
  assert.equal(found([2, 2]), null, 'an empty pixel picks nothing');
});
