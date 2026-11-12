import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canvasToKeep } from '../../src/model/canvas-room.js';

const FEET = { place: 'feet', ground: 0.8 };
const SQUARE = [8, 8];
const report = (drawnWidth, drawnHeight, fy = 0.5, cell = SQUARE) => ({
  cell,
  scaled: { fx: fy, fy, drawnWidth, drawnHeight },
});
const room = ({ height }) => Math.round(height * FEET.ground) - 4;

test('a picture that kept its own pixel size needs no other canvas', () => {
  const canvas = { width: 64, height: 64 };

  assert.equal(canvasToKeep({ cell: SQUARE, scaled: null }, canvas, FEET), null);
  assert.equal(canvasToKeep(report(20, 40, 1), canvas, FEET), null);
});

test('a character made smaller is offered the canvas its feet and head have room on', () => {
  const size = canvasToKeep(report(30, 60), { width: 64, height: 64 }, FEET);

  assert.deepEqual(size, { width: 80, height: 80 });
  assert.ok(room(size) >= 60, 'the cleaner gives it its whole height there');
});

test('art wider than it is tall is given room across, and a square canvas stays square', () => {
  assert.deepEqual(canvasToKeep(report(100, 20), { width: 64, height: 64 }, FEET), {
    width: 104,
    height: 104,
  });
});

test('a canvas that is not square grows only where the art needs it', () => {
  assert.deepEqual(canvasToKeep(report(30, 60), { width: 96, height: 48 }, FEET), {
    width: 96,
    height: 80,
  });
});

test('pixels that are not square in the picture are counted as the cleaner draws them', () => {
  const size = canvasToKeep(report(40, 20, 0.5, [12, 8]), { width: 32, height: 32 }, FEET);

  assert.deepEqual(size, { width: 64, height: 64 });
});

test('what stands in the middle keeps a pixel of margin', () => {
  const size = canvasToKeep(report(60, 60), { width: 48, height: 48 }, { place: 'centre' });

  assert.deepEqual(size, { width: 64, height: 64 });
});

test('a tile fills its canvas, and art larger than any canvas has none to offer', () => {
  const canvas = { width: 16, height: 16 };

  assert.equal(canvasToKeep(report(100, 100), canvas, { place: 'fill' }), null);
  assert.equal(canvasToKeep(report(100, 500), canvas, FEET), null);
});

test('a height asked for that did not fit is offered the canvas it needs', () => {
  const asked = {
    cell: [1, 1],
    scaled: { fy: 0.48, drawnHeight: 98, drawnWidth: 40, wantedHeight: 60 },
  };
  const size = canvasToKeep(asked, { width: 64, height: 64 }, { place: 'feet', ground: 0.8 });

  assert.ok(
    size && size.height >= Math.ceil(64 / 0.8),
    `room for 60 rows over the feet (${size?.height})`,
  );
  assert.equal(
    canvasToKeep(
      { ...asked, scaled: { ...asked.scaled, fy: 30 / 98, wantedHeight: 30 } },
      { width: 64, height: 64 },
      { place: 'feet', ground: 0.8 },
    ),
    null,
    'one that fitted is offered nothing',
  );
});
