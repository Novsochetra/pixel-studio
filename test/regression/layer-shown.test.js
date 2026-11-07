import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { copyFrameToViews } from '../../src/model/copy-frame.js';
import { addFrame } from '../../src/model/frames.js';
import { newProject } from '../../src/model/new-project.js';
import { setLayerShown } from '../../src/model/structure.js';

function projectWithTwoFrames(duplicate) {
  const project = newProject();
  const animation = project.animations[0];
  const direction = Object.keys(animation.directions)[0];

  addFrame(project, animation, 0, duplicate);

  return { project, animation, direction, frames: animation.directions[direction].frames };
}

// hiding a layer on a copied frame hid it on the frame it was copied from too
test('hiding a layer changes the one frame only', () => {
  const { frames } = projectWithTwoFrames(true);
  const { key } = frames[1].layers[0];

  setLayerShown(frames[1], key, false);

  assert.equal(frames[1].layers[0].visible, false);
  assert.equal(frames[0].layers[0].visible, true);
});

test('a copy of a frame keeps what was hidden on that frame', () => {
  const { project, animation, frames } = projectWithTwoFrames(false);
  const { key } = frames[1].layers[0];

  setLayerShown(frames[1], key, false);
  addFrame(project, animation, 1, true);

  assert.equal(frames[2].layers[0].visible, false);
  assert.equal(frames[0].layers[0].visible, true);
});

test('a new empty frame shows its layers, whatever another frame hides', () => {
  const { project, animation, frames } = projectWithTwoFrames(false);

  setLayerShown(frames[0], frames[0].layers[0].key, false);
  addFrame(project, animation, 1, false);

  assert.equal(frames[2].layers[0].visible, true);
});

test('copying a frame to the other views brings what it hides', () => {
  const { project, animation, direction, frames } = projectWithTwoFrames(true);
  const other = Object.keys(animation.directions).find((name) => name !== direction);

  setLayerShown(frames[1], frames[1].layers[0].key, false);
  copyFrameToViews(project, animation, direction, 1);

  assert.equal(animation.directions[other].frames[1].layers[0].visible, false);
  assert.equal(animation.directions[other].frames[0].layers[0].visible, true);
});
