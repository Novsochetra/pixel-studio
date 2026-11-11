import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fingerTap } from '../../src/ui/finger-tap.js';

const at = (pointerId, x, y, timeStamp) => ({ pointerId, clientX: x, clientY: y, timeStamp });
const up = (pointerId, timeStamp, type = 'pointerup') => ({ pointerId, timeStamp, type });

function twoDown(tap, time = 0) {
  tap.at(at(1, 100, 100, time));
  tap.at(at(2, 160, 100, time + 20));
}

test('two fingers down and up together are a tap of two, said as the last lifts', () => {
  const tap = fingerTap();

  twoDown(tap);
  assert.equal(tap.lifted(up(1, 120)), 0, 'one is still down');
  assert.equal(tap.lifted(up(2, 140)), 2);
});

test('three fingers are a tap of three', () => {
  const tap = fingerTap();

  twoDown(tap);
  tap.at(at(3, 220, 100, 40));
  tap.lifted(up(3, 100));
  tap.lifted(up(1, 110));
  assert.equal(tap.lifted(up(2, 120)), 3);
});

test('one finger is a tap of one, which is the tool’s', () => {
  const tap = fingerTap();

  tap.at(at(1, 100, 100, 0));
  assert.equal(tap.lifted(up(1, 80)), 1);
});

test('fingers that moved were a pinch or a pan, not a tap', () => {
  const tap = fingerTap();

  twoDown(tap);
  tap.at(at(2, 175, 100, 60));
  tap.lifted(up(1, 120));
  assert.equal(tap.lifted(up(2, 140)), 0);
});

test('a finger that trembles a few pixels still taps', () => {
  const tap = fingerTap();

  twoDown(tap);
  tap.at(at(2, 164, 103, 60));
  tap.lifted(up(1, 120));
  assert.equal(tap.lifted(up(2, 140)), 2);
});

test('fingers held are not a tap', () => {
  const tap = fingerTap();

  twoDown(tap);
  tap.lifted(up(1, 500));
  assert.equal(tap.lifted(up(2, 520)), 0);
});

test('a touch the browser took away is no tap', () => {
  const tap = fingerTap();

  twoDown(tap);
  tap.lifted(up(1, 100, 'pointercancel'));
  assert.equal(tap.lifted(up(2, 120)), 0);
});

test('a tap is said once: a mouse let go right after it taps nothing', () => {
  const tap = fingerTap();

  twoDown(tap);
  tap.lifted(up(1, 100));
  tap.lifted(up(2, 110));
  assert.equal(tap.lifted(up(9, 150)), 0);
});

test('the next touch starts its own count', () => {
  const tap = fingerTap();

  twoDown(tap);
  tap.at(at(2, 300, 300, 60));
  tap.lifted(up(1, 100));
  tap.lifted(up(2, 110));
  twoDown(tap, 1000);
  tap.lifted(up(1, 1100));
  assert.equal(tap.lifted(up(2, 1110)), 2);
});
