import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newFrame, newLayer } from '../../src/model/project.js';
import {
  duplicateLayers,
  groupOf,
  keptPick,
  pickRange,
  removeLayers,
  togglePick,
} from '../../src/model/layer-pick.js';

const SIZE = 8;

function stack() {
  const layers = ['bottom', 'middle', 'top'].map((key) => newLayer(SIZE, SIZE, { key }));

  return newFrame(SIZE, SIZE, layers);
}

const keysOf = (layers) => layers.map((layer) => layer.key);

test('with nothing picked together, only the layer being edited moves', () => {
  const frame = stack();

  assert.deepEqual(keysOf(groupOf(frame, frame.layers[1], [])), ['middle']);
});

test('the layers picked together move, in stack order', () => {
  const frame = stack();

  assert.deepEqual(keysOf(groupOf(frame, frame.layers[2], ['top', 'bottom'])), ['bottom', 'top']);
});

test('a group the layer being edited is not in does not count', () => {
  const frame = stack();

  assert.deepEqual(keysOf(groupOf(frame, frame.layers[1], ['top', 'bottom'])), ['middle']);
});

test('a picked layer this frame does not have is left out', () => {
  const frame = stack();

  assert.deepEqual(keysOf(groupOf(frame, frame.layers[0], ['bottom', 'gone'])), ['bottom']);
});

test('Shift-click takes every layer between the one being edited and the one clicked', () => {
  const frame = stack();

  assert.deepEqual(pickRange(frame, 'bottom', 'top'), ['bottom', 'middle', 'top']);
  assert.deepEqual(pickRange(frame, 'top', 'middle'), ['middle', 'top']);
});

test('Shift-click on the layer being edited makes no group', () => {
  assert.deepEqual(pickRange(stack(), 'middle', 'middle'), []);
});

test('⌘-click adds a layer, and that layer is the one being edited', () => {
  assert.deepEqual(togglePick(['bottom'], 'bottom', 'top'), {
    layer: 'top',
    picked: ['bottom', 'top'],
  });
});

test('⌘-click on a picked layer takes it away', () => {
  assert.deepEqual(togglePick(['bottom', 'middle', 'top'], 'bottom', 'middle'), {
    layer: 'bottom',
    picked: ['bottom', 'top'],
  });
});

test('taking away the layer being edited hands over to another picked layer', () => {
  assert.deepEqual(togglePick(['bottom', 'middle', 'top'], 'top', 'top'), {
    layer: 'middle',
    picked: ['bottom', 'middle'],
  });
});

test('a group left with one layer is no group', () => {
  assert.deepEqual(togglePick(['bottom', 'top'], 'bottom', 'top'), {
    layer: 'bottom',
    picked: [],
  });
});

test('the last picked layer stays picked', () => {
  assert.deepEqual(togglePick(['top'], 'top', 'top'), { layer: 'top', picked: [] });
});

test('a group lasts while the layer being edited is in it', () => {
  assert.deepEqual(keptPick(['bottom', 'top'], 'top'), ['bottom', 'top']);
  assert.deepEqual(keptPick(['bottom', 'top'], 'middle'), []);
});

// Delete and Duplicate took the layer being edited only, with three picked together
test('every layer picked together is deleted', () => {
  const frame = stack();

  assert.deepEqual(removeLayers({ directions: {} }, frame, ['bottom', 'top']), ['bottom', 'top']);
  assert.deepEqual(keysOf(frame.layers), ['middle']);
});

test('a frame keeps one layer of art when all of them are picked', () => {
  const frame = stack();
  const gone = removeLayers({ directions: {} }, frame, ['bottom', 'middle', 'top']);

  assert.equal(gone.length, 2);
  assert.equal(frame.layers.length, 1);
});

test('each layer picked together is copied just above itself', () => {
  const frame = stack();
  const copies = duplicateLayers(frame, ['bottom', 'top']);

  assert.equal(copies.length, 2);
  assert.deepEqual(keysOf(frame.layers), ['bottom', copies[0], 'middle', 'top', copies[1]]);
});
