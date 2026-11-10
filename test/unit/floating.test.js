import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CLEAR, createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { floatPiece, moveFloating, shiftOnCanvas } from '../../src/editor/floating.js';
import {
  liftPixels,
  moveSelected,
  rectSelection,
  selectionBox,
  transformSelected,
} from '../../src/editor/selection.js';
import { keptSelection } from '../../src/editor/selection-kept.js';
import { floodFill } from '../../src/editor/paint.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);

const count = (sprite, colour) => {
  let found = 0;

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      found += getPixel(sprite, x, y) === colour ? 1 : 0;
    }
  }

  return found;
};

function square(sprite, [left, top], size, colour) {
  for (let y = top; y < top + size; y++) {
    for (let x = left; x < left + size; x++) {
      setPixel(sprite, x, y, colour);
    }
  }
}

// a paste landed on its own original, and moving it took the original along: one square, not two
test('a pasted piece moved away leaves the original where it was', () => {
  const sprite = createSprite(16, 16);

  square(sprite, [2, 2], 4, RED);
  const copied = liftPixels(sprite, rectSelection(sprite, [2, 2], [5, 5]));
  const pasted = floatPiece(sprite, copied);
  const moved = moveFloating(sprite, pasted, 6, 0);

  assert.equal(count(sprite, RED), 32);
  assert.equal(getPixel(sprite, 2, 2), RED);
  assert.equal(getPixel(sprite, 8, 2), RED);
  assert.deepEqual(selectionBox(moved), { left: 8, top: 2, right: 11, bottom: 5 });
});

// the clear corners of a copied box tore a hole in the art they were dragged across
test('a pasted piece takes nothing of the art under it along, however often it moves', () => {
  const sprite = createSprite(16, 16);
  const piece = [
    { x: 0, y: 0, color: RED },
    { x: 1, y: 0, color: CLEAR },
  ];

  square(sprite, [0, 0], 16, BLUE);
  let floating = floatPiece(sprite, piece);

  for (let step = 0; step < 5; step++) {
    floating = moveFloating(sprite, floating, 2, 1);
  }

  assert.equal(count(sprite, RED), 1);
  assert.equal(count(sprite, BLUE), 16 * 16 - 1);
  assert.equal(getPixel(sprite, 10, 5), RED);
});

test('a pasted piece moved off the canvas and back is whole', () => {
  const sprite = createSprite(8, 8);
  const piece = [
    { x: 0, y: 0, color: RED },
    { x: 1, y: 0, color: RED },
  ];
  const off = moveFloating(sprite, floatPiece(sprite, piece), -5, 0);

  assert.equal(count(sprite, RED), 0);
  moveFloating(sprite, off, 5, 0);
  assert.equal(count(sprite, RED), 2);
});

test('in another frame or layer a pasted piece is a plain selection: what lay under it is not there', () => {
  const sprite = createSprite(8, 8);
  const floating = floatPiece(sprite, [{ x: 1, y: 1, color: RED }]);
  const front = { animation: 'idle', direction: 'south', frame: 0, layer: 'art' };
  const kept = keptSelection(floating, { from: front, to: { ...front, frame: 1 }, canvas: sprite });

  assert.equal(kept.floating, undefined);
  assert.deepEqual(selectionBox(kept), { left: 1, top: 1, right: 1, bottom: 1 });
  assert.equal(keptSelection(floating, { from: front, to: front, canvas: sprite }), floating);
});

// 30 px left then 30 px right left none of a selection's 20 pixels
test('selected art stops at the edge of the canvas instead of leaving it', () => {
  const sprite = createSprite(16, 16);

  square(sprite, [4, 4], 3, RED);
  const selection = rectSelection(sprite, [3, 3], [7, 7]);
  const lifted = liftPixels(sprite, selection);

  assert.deepEqual(shiftOnCanvas(lifted, sprite, [-30, 0]), [-4, 0]);
  assert.deepEqual(shiftOnCanvas(lifted, sprite, [30, 30]), [9, 9]);
  assert.deepEqual(shiftOnCanvas(lifted, sprite, [2, -1]), [2, -1]);

  const there = moveSelected(sprite, selection, ...shiftOnCanvas(lifted, sprite, [-30, 0]));

  moveSelected(sprite, there, 4, 0);
  assert.equal(count(sprite, RED), 9);
});

// each quarter turn of a 5×4 block rounded its half pixel the same way, walking it across the canvas
test('quarter turns bring a block back to where it started', () => {
  for (const [width, height] of [
    [5, 4],
    [4, 5],
    [6, 4],
    [3, 3],
    [7, 2],
  ]) {
    const sprite = createSprite(24, 24);
    const start = { left: 8, top: 8, right: 8 + width - 1, bottom: 8 + height - 1 };
    let selection = rectSelection(sprite, [start.left, start.top], [start.right, start.bottom]);

    square(sprite, [8, 8], 1, RED);

    for (const kind of ['rotate-cw', 'rotate-ccw']) {
      selection = transformSelected(sprite, selection, kind);
    }

    assert.deepEqual(selectionBox(selection), start, `${width}×${height} there and back`);

    for (let turn = 0; turn < 4; turn++) {
      selection = transformSelected(sprite, selection, 'rotate-cw');
    }

    assert.deepEqual(selectionBox(selection), start, `${width}×${height} all the way round`);
    assert.equal(getPixel(sprite, 8, 8), RED);
  }
});

// Palette lock on a blank canvas left the pencil with no colour at all, and Fill then never ended
test('a fill with no colour to fill with changes nothing and ends', () => {
  const sprite = createSprite(8, 8);

  assert.deepEqual(floodFill(sprite, [2, 2], undefined), []);
  assert.equal(count(sprite, CLEAR), 64);
  assert.equal(floodFill(sprite, [2, 2], RED).length, 64);
});
