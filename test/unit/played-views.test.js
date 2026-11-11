import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newProject } from '../../src/model/new-project.js';
import { addFrame } from '../../src/model/frames.js';
import { getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { playedSprite, playedViews } from '../../src/views/played-views.js';

const RED = pack(255, 0, 0);

function sideScroller() {
  const project = newProject({ kind: 'character', directionSet: 'side', width: 8, height: 8 });

  return { project, animation: project.animations[0] };
}

test('an animation plays its drawn views, then the sides the game flips them into', () => {
  const { project, animation } = sideScroller();

  assert.deepEqual(playedViews(project, animation), [
    { direction: 'east', source: 'east', flip: false },
    { direction: 'west', source: 'east', flip: true },
  ]);
});

test('a flipped side shows its view left to right, and a view short of frames holds its last', () => {
  const { project, animation } = sideScroller();
  const [drawn, flipped] = playedViews(project, animation);

  setPixel(animation.directions.east.frames[0].layers[0].sprite, 1, 2, RED);

  assert.equal(getPixel(playedSprite(project, animation, drawn, 0), 1, 2), RED);
  assert.equal(getPixel(playedSprite(project, animation, flipped, 0), 6, 2), RED);
  assert.equal(getPixel(playedSprite(project, animation, drawn, 3), 1, 2), RED);

  addFrame(project, animation, 0);
  assert.notEqual(getPixel(playedSprite(project, animation, drawn, 1), 1, 2), RED);
});
