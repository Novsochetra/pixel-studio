import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { addLayer, layerStack, moveLayer, removeLayer } from '../../src/model/structure.js';
import { addFrame } from '../../src/model/frames.js';
import { compositeFrame } from '../../src/model/composite.js';
import { drawableDirections } from '../../src/model/directions.js';
import { getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { buildSheet } from '../../src/export/sheet.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);

test('layers stay in step across every frame of an animation', () => {
  const project = newProject();
  const animation = project.animations[0];
  addFrame(project, animation, 0);
  const key = addLayer(project, animation, { name: 'Shading' });
  for (const entry of Object.values(animation.directions)) {
    for (const frame of entry.frames) {
      assert.deepEqual(
        frame.layers.map((layer) => layer.key),
        layerStack(animation).map((layer) => layer.key),
      );
    }
  }
  moveLayer(animation, key, -1);
  assert.equal(layerStack(animation)[0].key, key);
  assert.equal(removeLayer(animation, key), true);
  assert.equal(
    removeLayer(animation, layerStack(animation)[0].key),
    false,
    'the last art layer stays',
  );
});

test('the composite stacks visible art layers and leaves out pictures to trace', () => {
  const project = newProject();
  const animation = project.animations[0];
  const traceKey = addLayer(project, animation, { name: 'Trace', kind: 'reference' });
  const frame = animation.directions.south.frames[0];
  setPixel(frame.layers[0].sprite, 1, 1, RED);
  setPixel(frame.layers.find((layer) => layer.key === traceKey).sprite, 2, 2, BLUE);
  const out = compositeFrame(frame, 160, 160);
  assert.equal(getPixel(out, 1, 1), RED);
  assert.equal(getPixel(out, 2, 2), 0);
});

test('a side-scroller project draws one direction and mirrors the other', () => {
  const project = newProject({
    name: 'Slime',
    profile: 'generic',
    directionSet: 'side',
    width: 48,
    height: 32,
  });
  assert.deepEqual(Object.keys(project.animations[0].directions), ['east']);
  assert.equal(project.referenceDirection, 'east');
  assert.deepEqual(project.canvas, { width: 48, height: 32, scale: 5 });
  assert.equal(project.animations[0].directions.east.frames[0].layers[0].sprite.width, 48);
  const { rows, manifest } = buildSheet(project, project.animations[0], {
    frameWidth: 48,
    frameHeight: 32,
    anchorX: 24,
    anchorY: 25,
    artAnchor: { x: 24, y: 25 },
    includeMirrored: false,
  });
  assert.deepEqual(
    rows.map((row) => row.direction),
    ['east'],
  );
  assert.deepEqual(manifest.rows, { east: 0, west: { mirrorOf: 'east' } });
});

test('every direction set starts with directions it can draw', () => {
  for (const set of ['side', 'four', 'four-drawn', 'naga', 'eight']) {
    const project = newProject({ profile: 'generic', directionSet: set });
    const drawn = Object.keys(project.animations[0].directions);
    assert.ok(drawn.length >= 1);
    assert.ok(
      drawn.every((direction) => drawableDirections(project).includes(direction)),
      set,
    );
  }
});
