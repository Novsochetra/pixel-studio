import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { cloneSprite, getPixel, pack, samePixels } from '../../src/model/sprite.js';
import { addFrame } from '../../src/model/frames.js';
import { addDirection, framesOf, removeLayer } from '../../src/model/structure.js';
import { duplicateLayer, layerBelow, mergeDown } from '../../src/model/layer-ops.js';
import { copyFrameToViews } from '../../src/model/copy-frame.js';
import { duplicateAnimation, startAnimation } from '../../src/model/animations.js';
import { shiftFrame } from '../../src/model/frame-shift.js';
import {
  applyCut,
  bodyKey,
  poseBody,
  recolourRigs,
  rigOf,
  restoreBody,
} from '../../src/model/body/body.js';
import { bodyOf, isBody, isPosedBody } from '../../src/model/body/body-kind.js';
import { renderBody, restPose } from '../../src/model/body/rig.js';
import { History } from '../../src/editor/history.js';
import { cutCharacter, opaqueCount } from './body-helpers.js';

const BLUE = pack(0, 0, 255);

test('a cut takes the parts off the art, in every frame drawn the same, onto a posed Body', () => {
  const { animation, front, artKey, posed, source } = cutCharacter();
  const art = (frame) => frame.layers.find((layer) => layer.key === artKey).sprite;

  assert.equal(posed, 2);
  assert.ok(framesOf(animation).every((frame) => frame.layers.filter(isBody).length === 1));
  assert.equal(opaqueCount(art(front.frames[0])), 0);
  assert.ok(samePixels(bodyOf(front.frames[1]).sprite, source));
  assert.ok(isPosedBody(bodyOf(front.frames[1])));
  assert.equal(getPixel(art(front.frames[2]), 3, 3), BLUE, 'a frame drawn otherwise is left be');
  assert.ok(!isPosedBody(bodyOf(front.frames[2])));
});

test('cutting the view again redraws the frames posed with the old cut', () => {
  const { project, animation, front, rig } = cutCharacter();
  const smaller = { pieces: rig.pieces.filter((piece) => piece.id !== 'head') };

  applyCut(project, animation, { direction: 'south', frame: 0, rig: smaller });

  assert.equal(rigOf(animation, 'south'), smaller);
  assert.ok(
    samePixels(bodyOf(front.frames[0]).sprite, renderBody(smaller, restPose(), project.canvas)),
  );
});

test('a duplicated frame keeps its pose, a copied view its cut; a frame copied across is pixels', () => {
  const { project, animation, front } = cutCharacter();

  addDirection(project, animation, 'east', 'south');
  addFrame(project, animation, 0, true);
  assert.equal(bodyOf(front.frames[1]).pose, bodyOf(front.frames[0]).pose, 'the duplicate');
  assert.equal(rigOf(animation, 'east'), rigOf(animation, 'south'), 'a view copied takes the cut');

  copyFrameToViews(project, animation, 'south', 0);
  assert.ok(!isPosedBody(bodyOf(animation.directions.east.frames[0])));
});

test('the Body cannot be merged onto, its copy is plain art, and removing every one forgets the cuts', () => {
  const { animation, front } = cutCharacter();
  const key = bodyKey(animation);
  const frame = front.frames[0];
  const copy = duplicateLayer(frame, key);

  assert.equal(frame.layers.find((layer) => layer.key === copy).kind, 'art');
  assert.equal(layerBelow(frame, copy), null, 'nothing merges down onto the Body');
  assert.ok(removeLayer(animation, frame, key));

  for (const other of framesOf(animation)) {
    removeLayer(animation, other, key);
  }

  assert.equal(rigOf(animation, 'south'), null);
  assert.equal(animation.directions.south.rig, undefined);
});

test('a frame whose Body was deleted keeps the cut and gets its Body back to pose', () => {
  const { project, animation, front } = cutCharacter();
  const frame = front.frames[0];
  const key = bodyKey(animation);

  removeLayer(animation, frame, key);

  assert.equal(bodyOf(frame), null);
  assert.equal(rigOf(animation, 'south'), front.rig, 'the other frames still use the cut');
  assert.ok(bodyOf(front.frames[1]), 'and still have their Body');

  const restored = restoreBody(project, animation, frame);

  assert.equal(restored.key, key);
  assert.equal(bodyOf(frame), restored);
});

test('merging the Body down leaves plain pixels and no cut', () => {
  const { animation, front, source } = cutCharacter();

  for (const frame of framesOf(animation)) {
    mergeDown(animation, frame, bodyKey(animation));
  }

  assert.ok(samePixels(front.frames[0].layers[0].sprite, source));
  assert.equal(animation.directions.south.rig, undefined);
});

test('a copied animation, or one started from its pose, keeps the parts', () => {
  const { project, animation } = cutCharacter();
  const copy = duplicateAnimation(project, animation);
  const run = startAnimation(project, animation, { name: 'Run', frames: 3, start: 'pose' });

  assert.equal(rigOf(copy, 'south'), rigOf(animation, 'south'));
  assert.equal(run.directions.south.frames.length, 3);
  assert.ok(run.directions.south.frames.every((frame) => isPosedBody(bodyOf(frame))));
  assert.equal(rigOf(run, 'south'), rigOf(animation, 'south'));
});

test('moving the whole frame moves the pose with it', () => {
  const { project, front, rig } = cutCharacter();
  const body = bodyOf(front.frames[0]);

  shiftFrame(front.frames[0], [3, -2]);
  assert.deepEqual([body.pose.x, body.pose.y], [3, -2]);
  assert.ok(samePixels(body.sprite, renderBody(rig, body.pose, project.canvas)));
});

test('undo puts a pose back with its pixels, and a colour swap back in the cut', () => {
  const { project, animation, front, rig } = cutCharacter();
  const body = bodyOf(front.frames[0]);
  const history = new History((id) => (id === body.id ? body : null));
  const [restPixels, restPoseOf] = [cloneSprite(body.sprite), body.pose];
  const turned = { ...restPoseOf, parts: { head: { x: 0, y: 0, angle: 20 } } };

  poseBody(body, { rig, pose: turned, canvas: project.canvas });
  history.record('Turn Head', [{ layer: body, before: restPixels, poseBefore: restPoseOf }]);
  history.undo(project);
  assert.equal(body.pose, restPoseOf);
  assert.ok(samePixels(body.sprite, restPixels));

  const [change] = recolourRigs(project, { [rig.pieces[0].art.colours[0]]: BLUE });

  animation.directions.south.rig = change.after;
  history.record('Swap colours', [], [change]);
  history.undo(project);
  assert.equal(animation.directions.south.rig, rig);
});
