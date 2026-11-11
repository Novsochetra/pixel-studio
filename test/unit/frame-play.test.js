import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { addFrame, moveFrame } from '../../src/model/frames.js';
import {
  frameAtTime,
  isFrameHidden,
  playedFrames,
  setFrameHidden,
} from '../../src/model/frame-play.js';

function fourFrames() {
  const project = newProject();
  const animation = project.animations[0];

  for (let i = 0; i < 3; i++) {
    addFrame(project, animation, i);
  }

  return animation;
}

test('play shows the frame its time has reached, going round, never one before its start', () => {
  const play = { from: 1, fps: 8, order: [0, 1, 2, 3] };

  assert.equal(frameAtTime(play, 0), 1);
  assert.equal(frameAtTime(play, 124), 1);
  assert.equal(frameAtTime(play, 125), 2);
  assert.equal(frameAtTime(play, 500), 1);
  assert.equal(frameAtTime(play, -5), 1);
});

test('a hidden frame is hidden in every view, and shown again in every view', () => {
  const animation = fourFrames();

  setFrameHidden(animation, 2, true);

  assert.ok(isFrameHidden(animation, 2));
  assert.ok(Object.values(animation.directions).every((entry) => entry.frames[2].hidden));
  assert.ok(!isFrameHidden(animation, 1));

  setFrameHidden(animation, 2, false);

  assert.ok(!isFrameHidden(animation, 2));
  assert.ok(Object.values(animation.directions).every((entry) => !('hidden' in entry.frames[2])));
});

test('play skips hidden frames, and starts at the next frame shown when its own is hidden', () => {
  const animation = fourFrames();

  setFrameHidden(animation, 1, true);
  const play = { from: 1, fps: 8, order: playedFrames(animation) };

  assert.deepEqual(play.order, [0, 2, 3]);
  assert.equal(frameAtTime(play, 0), 2);
  assert.equal(frameAtTime(play, 125), 3);
  assert.equal(frameAtTime(play, 250), 0);
  assert.equal(frameAtTime({ ...play, from: 3 }, 125), 0);
});

test('with every frame hidden, play goes through them all rather than stopping', () => {
  const animation = fourFrames();

  [0, 1, 2, 3].forEach((index) => setFrameHidden(animation, index, true));

  assert.deepEqual(playedFrames(animation), [0, 1, 2, 3]);
});

test('a hidden frame stays hidden as it is moved', () => {
  const animation = fourFrames();

  setFrameHidden(animation, 0, true);
  moveFrame(animation, 0, 3);

  assert.ok(isFrameHidden(animation, 3));
  assert.deepEqual(playedFrames(animation), [0, 1, 2]);
});
