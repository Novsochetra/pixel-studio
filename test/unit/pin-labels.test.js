import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { labelPlaces } from '../../src/ui/pin-labels.js';

const widthOf = (name) => name.length * 7;
const at = (places, name) => places.find((label) => label.name === name);

test('a pin’s name is written beside its dot', () => {
  const [label] = labelPlaces([{ name: 'HEAD', x: 40, y: 20, radius: 4 }], widthOf);

  assert.deepEqual({ x: label.x, y: label.y }, { x: 47, y: 23 });
});

// the two feet of a figure, a pixel or two apart, had their names written one over the other
test('the names of pins close together are written on lines of their own', () => {
  const places = labelPlaces(
    [
      { name: 'RIGHT FOOT', x: 44, y: 101, radius: 4 },
      { name: 'LEFT FOOT', x: 40, y: 100, radius: 4 },
      { name: 'BALL', x: 46, y: 104, radius: 4 },
    ],
    widthOf,
  );
  const apart = (one, other) =>
    Math.abs(one.y - other.y) >= 13 ||
    one.x + one.width <= other.x ||
    other.x + other.width <= one.x;

  for (const one of places) {
    for (const other of places.filter((label) => label !== one)) {
      assert.ok(apart(one, other), `${one.name} is clear of ${other.name}`);
    }
  }

  assert.equal(at(places, 'LEFT FOOT').y, 103, 'the upper one stays beside its dot');
});

test('pins far apart keep their names beside them', () => {
  const places = labelPlaces(
    [
      { name: 'HEAD', x: 40, y: 20, radius: 4 },
      { name: 'HAND', x: 200, y: 22, radius: 4 },
    ],
    widthOf,
  );

  assert.equal(at(places, 'HEAD').y, 23);
  assert.equal(at(places, 'HAND').y, 25);
});
