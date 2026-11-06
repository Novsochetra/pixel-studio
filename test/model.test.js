import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../src/model/new-project.js';
import { addLayer, layerStack, moveLayer, removeLayer } from '../src/model/structure.js';
import { addFrame } from '../src/model/frames.js';
import { compositeFrame } from '../src/model/composite.js';
import { createSprite, getPixel, pack, setPixel } from '../src/model/sprite.js';
import { moveSelected, rectSelection, colourSelection } from '../src/editor/selection.js';
import { Stroke } from '../src/editor/stroke.js';
import { buildSheet } from '../src/export/sheet.js';
import { artAnchor, fittedFrame } from '../src/export/anchor.js';

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

test('moving a selection carries its pixels and leaves the gap clear', () => {
  const sprite = createSprite(8, 8);
  setPixel(sprite, 2, 2, RED);
  const moved = moveSelected(sprite, rectSelection({ width: 8, height: 8 }, [2, 2], [2, 2]), 3, 1);
  assert.equal(getPixel(sprite, 2, 2), 0);
  assert.equal(getPixel(sprite, 5, 3), RED);
  assert.equal(moved.cells[3 * 8 + 5], 1);
  assert.equal(
    colourSelection(sprite, 5, 3, false).cells.reduce((first, second) => first + second, 0),
    1,
  );
});

test('clean lines removes the L corner a diagonal stroke leaves', () => {
  const sprite = createSprite(8, 8);
  const stroke = new Stroke(sprite, RED, { cleanLines: true });
  stroke.add(1, 1);
  stroke.add(2, 1);
  stroke.add(2, 2);
  assert.equal(getPixel(sprite, 2, 1), 0);
  assert.equal(getPixel(sprite, 2, 2), RED);
});

test('a sprite sheet puts the feet on the frame anchor, frames across, directions down', () => {
  const project = newProject();
  const animation = project.animations[0];
  addFrame(project, animation, 0);
  const art = animation.directions.south.frames[1].layers[0].sprite;
  setPixel(art, 80, 128, RED);
  setPixel(art, 80, 100, BLUE);
  const anchor = artAnchor(art);
  assert.deepEqual(anchor, { x: 80, y: 128 });
  const fit = fittedFrame(project, animation, anchor);
  const { sheet, rows, frames, manifest } = buildSheet(project, animation, {
    ...fit,
    artAnchor: anchor,
    includeMirrored: false,
  });
  assert.equal(frames, 2);
  assert.deepEqual(
    rows.map((row) => row.direction),
    ['south', 'east', 'north'],
  );
  assert.equal(getPixel(sheet, fit.frameWidth + fit.anchorX, fit.anchorY), RED);
  assert.equal(getPixel(sheet, fit.frameWidth + fit.anchorX, fit.anchorY - 28), BLUE);
  assert.deepEqual(manifest.rows, { south: 0, east: 1, north: 2, west: { mirrorOf: 'east' } });
});
