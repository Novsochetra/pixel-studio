import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { analyzeReference, cleanAlone, cleanLike } from '../../src/clean/like.js';
import { bbox } from '../../src/clean/layout.js';

const fixtures = new URL('../../fixtures/', import.meta.url);

function load(name) {
  const { width, height } = JSON.parse(readFileSync(new URL(`${name}.json`, fixtures)));

  return { width, height, data: new Uint8Array(readFileSync(new URL(`${name}.rgba`, fixtures))) };
}

const side = load('side.webp');
const boxOf = (cleaned) => bbox(cleaned.opaque, cleaned.width);

test('a character with nothing to match stands on its ground line, centred', () => {
  const cleaned = cleanAlone(side, { width: 160, height: 160 }, { place: 'feet', ground: 0.8 });
  const box = boxOf(cleaned);

  assert.equal(box.bottom - 1, 128);
  assert.ok(Math.abs(box.left + box.right - 160) <= 2);
});

test("an object stands on its kind's lower ground line", () => {
  const box = boxOf(cleanAlone(side, { width: 160, height: 160 }, { place: 'feet', ground: 0.9 }));

  assert.equal(box.bottom - 1, 144);
});

test('an effect or icon is fitted inside its canvas and centred both ways', () => {
  const box = boxOf(cleanAlone(side, { width: 48, height: 48 }, { place: 'centre' }));

  assert.ok(box.bottom - box.top <= 46 && box.right - box.left <= 46);
  assert.ok(Math.abs(box.top - (48 - box.bottom)) <= 1);
  assert.ok(Math.abs(box.left - (48 - box.right)) <= 1);
});

test('a tile is scaled to fill its canvas edge to edge', () => {
  const cleaned = cleanAlone(side, { width: 16, height: 16 }, { place: 'fill' });

  assert.deepEqual(boxOf(cleaned), { left: 0, top: 0, right: 16, bottom: 16 });
  assert.ok(cleaned.report.scaled.fx > 0 && cleaned.report.scaled.fy > 0);
});

test('a later frame keeps its own height instead of taking the reference pose', () => {
  // the back image was drawn smaller than the front: matching scales it up, keeping does not
  const back = load('back2.webp');
  const ref = analyzeReference(load('front.png'));
  const matched = boxOf(cleanLike(back, ref));
  const own = cleanLike(back, ref, { keepScale: true });
  const kept = boxOf(own);
  const refBox = bbox(ref.opaque, ref.width);
  assert.equal(
    matched.bottom - matched.top,
    refBox.bottom - refBox.top,
    'matching takes the pose height',
  );
  assert.notEqual(kept.bottom - kept.top, refBox.bottom - refBox.top, 'keeping does not');
  assert.equal(own.report.scaled?.fy ?? 1, 1);
  assert.equal(kept.bottom, matched.bottom, 'both stand on the same feet row');
});

// a height typed taller than the canvas has room for put the art's head above the canvas's top
test('a height asked for is kept to the room the canvas has, and says so', () => {
  const cleaned = cleanAlone(
    side,
    { width: 64, height: 64 },
    { place: 'feet', ground: 0.8, height: 100 },
  );
  const box = boxOf(cleaned);

  assert.ok(box.top >= 0 && box.bottom - 1 === 51, 'whole, feet on the line');
  assert.equal(cleaned.report.scaled.wantedHeight, 100);
  assert.ok(box.bottom - box.top <= 47);
});
