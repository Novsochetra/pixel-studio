import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { addFrame } from '../../src/model/frames.js';
import { addLayer } from '../../src/model/structure.js';
import { duplicateLayer, layerBelow, mergeDown, placeLayer } from '../../src/model/layer-ops.js';
import { getPixel, pack, setPixel, CLEAR } from '../../src/model/sprite.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);

function withHair() {
  const project = newProject({ kind: 'character', width: 8, height: 8 });
  const animation = project.animations[0];
  const frame = animation.directions.south.frames[0];
  const [body] = frame.layers;
  const hair = addLayer(project, frame, { name: 'Hair', above: body.key });
  setPixel(frame.layers[0].sprite, 1, 1, RED);
  setPixel(frame.layers[0].sprite, 2, 2, RED);
  setPixel(frame.layers[1].sprite, 2, 2, BLUE);

  return { project, animation, body: body.key, hair, frame };
}

const namesIn = (frame) => frame.layers.map((layer) => layer.name);

test('a duplicated layer sits just above, a copy of its art', () => {
  const { hair, frame } = withHair();
  const copy = duplicateLayer(frame, hair);

  assert.deepEqual(namesIn(frame), ['Art', 'Hair', 'Hair copy']);
  assert.equal(getPixel(frame.layers[2].sprite, 2, 2), BLUE);
  assert.notEqual(frame.layers[2].sprite, frame.layers[1].sprite);
  assert.equal(frame.layers[2].key, copy);
});

test('merging down paints the layer onto the one below and leaves one layer', () => {
  const { animation, body, hair, frame } = withHair();

  assert.equal(mergeDown(animation, frame, hair), body);
  assert.deepEqual(namesIn(frame), ['Art']);
  assert.equal(getPixel(frame.layers[0].sprite, 2, 2), BLUE, 'the hair covers the body');
  assert.equal(getPixel(frame.layers[0].sprite, 1, 1), RED, 'the rest of the body stays');
  assert.equal(mergeDown(animation, frame, body), null, 'the bottom layer has nothing below');
});

test('a picture to trace never takes art, nor gives it', () => {
  const { frame, body } = withHair();
  const project = { canvas: { width: 8, height: 8 } };
  const trace = addLayer(project, frame, { name: 'Trace', kind: 'reference', above: body });

  assert.equal(layerBelow(frame, trace), null);
  placeLayer(frame, trace, 0);
  assert.equal(layerBelow(frame, body), null);
});

test('a layer is placed anywhere in the stack of its own frame', () => {
  const { project, animation, hair, frame } = withHair();

  addFrame(project, animation, 0, true);
  const copied = animation.directions.south.frames[1];

  placeLayer(frame, hair, 0);
  assert.deepEqual(namesIn(frame), ['Hair', 'Art']);
  assert.equal(getPixel(frame.layers[0].sprite, 1, 1), CLEAR);
  assert.deepEqual(namesIn(copied), ['Art', 'Hair'], 'its copy in the next frame stays as it was');
});

test('a hidden layer does not merge: its art would come into view', () => {
  const { hair, frame } = withHair();

  frame.layers[1].visible = false;
  assert.equal(layerBelow(frame, hair), null);
});
