import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { addLayer, removeLayer } from '../../src/model/structure.js';
import { addFrame, hasArt } from '../../src/model/frames.js';
import { copyFrameToViews } from '../../src/model/copy-frame.js';
import { pack, setPixel } from '../../src/model/sprite.js';

const RED = pack(255, 0, 0);

function twoFramesOfArt() {
  const project = newProject({ kind: 'character', width: 8, height: 8 });
  const animation = project.animations[0];

  for (const { frames } of Object.values(animation.directions)) {
    setPixel(frames[0].layers[0].sprite, 1, 1, RED);
  }

  addFrame(project, animation, 0, true);

  return { project, animation, front: animation.directions.south, side: animation.directions.east };
}

test('deleting the first layer of a frame left every frame of every view empty', () => {
  const { project, animation, front, side } = twoFramesOfArt();
  const frame = front.frames[1];
  const original = frame.layers[0].key;
  const hair = addLayer(project, frame, { name: 'Hair' });

  setPixel(frame.layers[1].sprite, 2, 2, RED);

  assert.ok(removeLayer(animation, frame, original));
  assert.deepEqual(
    frame.layers.map((layer) => layer.key),
    [hair],
  );
  assert.ok(hasArt(frame), 'the frame keeps its other layer');
  assert.ok(hasArt(front.frames[0]), 'the frame before keeps its art');
  assert.ok(hasArt(side.frames[1]), 'the same frame of another view keeps its art');
  assert.equal(front.frames.length, 2);
  assert.equal(side.frames.length, 2);
});

test('a duplicated frame carries the layers of its own frame, not those of the first frame', () => {
  const { project, animation, front } = twoFramesOfArt();

  addLayer(project, front.frames[1], { name: 'Hair' });
  addFrame(project, animation, 1, true);

  assert.deepEqual(
    front.frames[2].layers.map((layer) => layer.name),
    ['Art', 'Hair'],
  );
});

test('copying a frame to the other views brought only the layers they already had', () => {
  const { project, animation, front, side } = twoFramesOfArt();

  addLayer(project, front.frames[1], { name: 'Hair' });
  copyFrameToViews(project, animation, 'south', 1);

  assert.deepEqual(
    side.frames[1].layers.map((layer) => layer.name),
    ['Art', 'Hair'],
  );
  assert.notEqual(side.frames[1].layers[0].sprite, front.frames[1].layers[0].sprite);
});
