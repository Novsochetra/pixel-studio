import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { addLayer, removeLayer } from '../../src/model/structure.js';
import { addFrame } from '../../src/model/frames.js';
import { compositeFrame } from '../../src/model/composite.js';
import { drawableDirections } from '../../src/model/directions.js';
import { getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { buildSheet } from '../../src/export/sheet.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);

test('a layer is added to, and removed from, its own frame only', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  const [frame, next] = animation.directions.south.frames;
  const key = addLayer(project, frame, { name: 'Shading' });

  assert.equal(frame.layers.length, 2);
  assert.equal(next.layers.length, 1, 'the next frame does not get it');
  assert.equal(animation.directions.east.frames[0].layers.length, 1, 'nor does another view');
  assert.equal(removeLayer(animation, frame, key), true);
  assert.equal(frame.layers.length, 1);
  assert.equal(removeLayer(animation, frame, frame.layers[0].key), false, 'the last art stays');
});

test('the composite stacks visible art layers and leaves out pictures to trace', () => {
  const project = newProject();
  const animation = project.animations[0];
  const frame = animation.directions.south.frames[0];
  const traceKey = addLayer(project, frame, { name: 'Trace', kind: 'reference' });

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

test('the box around several boxes leaves out the empty ones', async () => {
  const { unionBounds } = await import('../../src/model/sprite.js');

  assert.deepEqual(
    unionBounds([
      { left: 2, top: 5, right: 4, bottom: 9 },
      null,
      { left: 1, top: 6, right: 3, bottom: 7 },
    ]),
    { left: 1, top: 5, right: 4, bottom: 9 },
  );
  assert.equal(unionBounds([null]), null);
});

test('an animation draws its views in compass order, lacks the rest, and flips the missing sides', async () => {
  const { drawnDirections, flippedSides, missingDirections } =
    await import('../../src/model/directions.js');
  const project = newProject({ kind: 'character', directionSet: 'four' });
  const animation = project.animations[0];

  assert.deepEqual(drawnDirections(animation), ['south', 'east', 'north']);
  assert.deepEqual(missingDirections(project, animation), []);
  assert.deepEqual(flippedSides(project, animation), [['west', 'east']]);
  delete animation.directions.east;
  assert.deepEqual(missingDirections(project, animation), ['east']);
  assert.deepEqual(flippedSides(project, animation), []);
});

test('removing an animation opens the one before it, and never removes the last', async () => {
  const { addAnimation, removeAnimation } = await import('../../src/model/structure.js');
  const project = newProject();
  const [idle] = project.animations;
  const walk = addAnimation(project, 'Walk', ['south']);
  const run = addAnimation(project, 'Run', ['south']);

  assert.equal(removeAnimation(project, walk.id), idle);
  assert.equal(removeAnimation(project, idle.id), run);
  assert.equal(removeAnimation(project, run.id), run);
  assert.deepEqual(project.animations, [run]);
});
