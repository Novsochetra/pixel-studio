import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { addLayer, layerStack } from '../../src/model/structure.js';
import { duplicateLayer, layerBelow, mergeDown, placeLayer } from '../../src/model/layer-ops.js';
import { getPixel, pack, setPixel, CLEAR } from '../../src/model/sprite.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);

function withHair() {
  const project = newProject({ kind: 'character', width: 8, height: 8 });
  const animation = project.animations[0];
  const [body] = layerStack(animation);
  const hair = addLayer(project, animation, { name: 'Hair', above: body.key });
  const frame = animation.directions.south.frames[0];
  setPixel(frame.layers[0].sprite, 1, 1, RED);
  setPixel(frame.layers[0].sprite, 2, 2, RED);
  setPixel(frame.layers[1].sprite, 2, 2, BLUE);

  return { animation, body: body.key, hair, frame };
}

test('a duplicated layer sits just above, a copy of its art in every frame', () => {
  const { animation, hair, frame } = withHair();
  const copy = duplicateLayer(animation, hair);

  assert.deepEqual(
    layerStack(animation).map((entry) => entry.name),
    ['Art', 'Hair', 'Hair copy'],
  );
  assert.equal(getPixel(frame.layers[2].sprite, 2, 2), BLUE);
  assert.notEqual(frame.layers[2].sprite, frame.layers[1].sprite);
  assert.equal(frame.layers[2].key, copy);
});

test('merging down paints the layer onto the one below and leaves one layer', () => {
  const { animation, body, hair, frame } = withHair();

  assert.equal(mergeDown(animation, hair), body);
  assert.deepEqual(
    layerStack(animation).map((entry) => entry.name),
    ['Art'],
  );
  assert.equal(getPixel(frame.layers[0].sprite, 2, 2), BLUE, 'the hair covers the body');
  assert.equal(getPixel(frame.layers[0].sprite, 1, 1), RED, 'the rest of the body stays');
  assert.equal(mergeDown(animation, body), null, 'the bottom layer has nothing below');
});

test('a picture to trace never takes art, nor gives it', () => {
  const { animation, body } = withHair();
  const project = { canvas: { width: 8, height: 8 } };
  const trace = addLayer(project, animation, { name: 'Trace', kind: 'reference', above: body });

  assert.equal(layerBelow(animation, trace), null);
  placeLayer(animation, trace, 0);
  assert.equal(layerBelow(animation, body), null);
});

test('a layer is placed anywhere in the stack, in every frame alike', () => {
  const { animation, hair, frame } = withHair();

  placeLayer(animation, hair, 0);
  assert.deepEqual(
    layerStack(animation).map((entry) => entry.name),
    ['Hair', 'Art'],
  );
  assert.equal(getPixel(frame.layers[0].sprite, 1, 1), CLEAR);
  assert.ok(
    Object.values(animation.directions).every(({ frames }) =>
      frames.every((other) => other.layers[0].key === hair),
    ),
  );
});
