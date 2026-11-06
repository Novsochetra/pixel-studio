import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { addFrame } from '../../src/model/frames.js';
import { createSprite, getPixel, pack, setPixel, CLEAR } from '../../src/model/sprite.js';
import { buildSheet } from '../../src/export/sheet.js';
import { NAGA_ELEVEN } from '../../src/model/presets.js';
import { fittedFrame } from '../../src/export/anchor.js';
import { changedLayers, snapshotAnimations } from '../../src/editor/history.js';
import { Stroke } from '../../src/editor/stroke.js';

const GAME_FRAME = NAGA_ELEVEN.game.frame;
const RED = pack(255, 0, 0);

// a foot lower in another frame than in the standing pose fell outside the frame Fit the art made
test('Fit the art also holds a foot below the standing feet', () => {
  const project = newProject();
  const animation = project.animations[0];
  const anchor = { x: 80, y: 128 };

  addFrame(project, animation, 0);
  setPixel(animation.directions.south.frames[0].layers[0].sprite, 80, 128, RED);
  setPixel(animation.directions.south.frames[1].layers[0].sprite, 80, 131, RED);
  const fit = fittedFrame(project, animation, anchor);
  const { warnings } = buildSheet(project, animation, {
    ...fit,
    artAnchor: anchor,
    includeMirrored: false,
  });

  assert.deepEqual(
    warnings.filter((warning) => warning.includes('outside')),
    [],
  );
});

// the flipped west row stood a column off the anchor in a frame of even width
test('a flipped west row keeps the feet on the anchor column, even frame width too', () => {
  const project = newProject();
  const animation = project.animations[0];

  setPixel(animation.directions.east.frames[0].layers[0].sprite, 80, 128, RED);
  const { sheet, rows } = buildSheet(project, animation, {
    ...GAME_FRAME,
    artAnchor: { x: 80, y: 128 },
    includeMirrored: true,
  });
  const west = rows.findIndex((row) => row.direction === 'west');

  assert.equal(
    getPixel(sheet, GAME_FRAME.anchorX, west * GAME_FRAME.frameHeight + GAME_FRAME.anchorY),
    RED,
  );
});

// a layer drawn on just before adding a frame was left out of the layers that change saved
test('a structural change reports every layer whose pixels it changed', () => {
  const project = newProject();
  const before = snapshotAnimations(project.animations);
  const layer = project.animations[0].directions.north.frames[0].layers[0];

  setPixel(layer.sprite, 1, 1, RED);
  addFrame(project, project.animations[0], 0);
  const ids = changedLayers(before, project.animations);
  const views = Object.values(project.animations[0].directions);

  assert.ok(ids.includes(layer.id));
  views.forEach((entry) => assert.ok(ids.includes(entry.frames[1].layers[0].id)));
  assert.equal(ids.length, 1 + views.length);
});

// the eraser left the corner pixel of an L-shaped drag standing
test('the eraser takes out the corner of an L-shaped drag', () => {
  const sprite = createSprite(8, 8);
  const eraser = new Stroke(sprite, CLEAR, { cleanLines: false });

  for (const [x, y] of [
    [1, 1],
    [2, 1],
    [2, 2],
  ]) {
    setPixel(sprite, x, y, RED);
  }

  eraser.add(1, 1);
  eraser.add(2, 1);
  eraser.add(2, 2);

  assert.equal(getPixel(sprite, 2, 1), CLEAR);
});
