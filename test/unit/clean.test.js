import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { analyzeReference, cleanLike } from '../../src/clean/like.js';
import { toRgba } from '../../src/clean/scale.js';

const fixtures = new URL('../../fixtures/', import.meta.url);

function load(name) {
  const { width, height } = JSON.parse(readFileSync(new URL(`${name}.json`, fixtures)));

  return { width, height, data: new Uint8Array(readFileSync(new URL(`${name}.rgba`, fixtures))) };
}

function differentPixels(actual, expected) {
  let count = 0;

  for (let i = 0; i < expected.length; i += 4) {
    if (actual.subarray(i, i + 4).some((value, colour) => value !== expected[i + colour])) {
      count++;
    }
  }

  return count;
}

const ref = analyzeReference(load('front.png'));
const expectedMeta = JSON.parse(readFileSync(new URL('expected.json', fixtures)));

test('the reference front rebuilds exactly like pixel_clean.py', () => {
  const expected = readFileSync(new URL('front.expected.rgba', fixtures));

  assert.deepEqual(ref.cell, [5, 5]);
  assert.equal(differentPixels(toRgba(ref), expected), 0);
});

for (const name of ['side.webp', 'back.webp', 'back2.webp']) {
  test(`${name} cleans pixel for pixel like pixel_clean.py --like front.png`, () => {
    const result = cleanLike(load(name), ref);
    const expected = readFileSync(new URL(`${name}.expected.rgba`, fixtures));

    assert.deepEqual(
      result.report.cell.map((value) => value.toFixed(4)),
      expectedMeta[name].cell.map((value) => value.toFixed(4)),
    );
    assert.equal(differentPixels(toRgba(result), expected), 0);
  });
}

for (const name of ['front-800-transparent.png', 'front-160-native.png']) {
  test(`a transparent front (${name}) works as the reference too`, () => {
    const otherRef = analyzeReference(load(name));
    const result = cleanLike(load('back2.webp'), otherRef);
    const expected = readFileSync(new URL('back2.webp.expected.rgba', fixtures));

    assert.equal(differentPixels(toRgba(result), expected), 0);
  });
}
