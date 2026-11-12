import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { getPixel, pack, setPixel } from '../../src/model/sprite.js';
import {
  addFrame,
  addFrameAtEnd,
  frameCount,
  heldFrame,
  moveFrame,
  reachFrame,
  removeFrame,
  removeViewFrame,
} from '../../src/model/frames.js';
import { copyFrameToViews } from '../../src/model/copy-frame.js';
import { isFrameHidden, setFrameHidden } from '../../src/model/frame-play.js';
import { addDirection, removeDirection } from '../../src/model/structure.js';

const RED = pack(255, 0, 0);
const counts = (animation) =>
  Object.values(animation.directions).map((entry) => entry.frames.length);
const art = (animation, direction, frame) =>
  animation.directions[direction].frames[frame].layers[0].sprite;

// marks frame `i` of every view with a pixel in column i, so order can be read back
function numbered(animation) {
  for (const entry of Object.values(animation.directions)) {
    entry.frames.forEach((frame, i) => setPixel(frame.layers[0].sprite, i, 0, RED));
  }
}

const order = (animation, direction) =>
  animation.directions[direction].frames.map((frame) =>
    [0, 1, 2, 3].find((x) => getPixel(frame.layers[0].sprite, x, 0) === RED),
  );

test('a new frame is added to every view, so frame 2 exists wherever you upload to it', () => {
  const project = newProject();
  const animation = project.animations[0];

  assert.equal(addFrame(project, animation, 0), 1);
  assert.deepEqual(counts(animation), [2, 2, 2]);
  assert.equal(frameCount(animation), 2);
});

test('duplicating a frame copies each view its own pose', () => {
  const project = newProject();
  const animation = project.animations[0];

  setPixel(art(animation, 'east', 0), 5, 5, RED);
  addFrame(project, animation, 0, true);
  assert.equal(getPixel(art(animation, 'east', 1), 5, 5), RED);
  assert.equal(getPixel(art(animation, 'south', 1), 5, 5), 0);
  assert.notEqual(art(animation, 'east', 1), art(animation, 'east', 0));
});

test('dragging a frame moves it in every view, to any place in the strip', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  addFrame(project, animation, 2);
  numbered(animation);
  assert.equal(moveFrame(animation, 0, 2), 2);
  assert.deepEqual(order(animation, 'south'), [1, 2, 0, 3]);
  assert.deepEqual(order(animation, 'north'), [1, 2, 0, 3]);
  assert.equal(moveFrame(animation, 3, 0), 0);
  assert.deepEqual(order(animation, 'east'), [3, 1, 2, 0]);
  assert.equal(moveFrame(animation, 1, 99), 3, 'past the end lands last');
  assert.equal(moveFrame(animation, 2, 2), 2, 'onto itself changes nothing');
});

test('deleting a frame removes it from every view, and the last frame stays', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  assert.equal(removeFrame(animation, 1), 0);
  assert.deepEqual(counts(animation), [1, 1, 1]);
  assert.equal(removeFrame(animation, 0), 0);
  assert.deepEqual(counts(animation), [1, 1, 1]);
});

test('a view switched on later gets every frame the others have', () => {
  const project = newProject({ directionSet: 'eight' });
  const animation = project.animations[0];

  removeDirection(animation, 'west');
  addFrame(project, animation, 0);
  addFrame(project, animation, 0);
  addDirection(project, animation, 'west');
  assert.equal(animation.directions.west.frames.length, 3);
});

test('deleting a frame from one view leaves the other views alone', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  numbered(animation);

  assert.equal(removeViewFrame(animation, 'south', 1), 1);
  assert.deepEqual(order(animation, 'south'), [0, 2]);
  assert.deepEqual(order(animation, 'east'), [0, 1, 2]);
  assert.equal(frameCount(animation), 3, 'the longest view still sets the count');
  assert.equal(removeViewFrame(animation, 'south', 1), 0, 'the last place goes back one');
  assert.equal(removeViewFrame(animation, 'south', 0), 0);
  assert.deepEqual(order(animation, 'south'), [0], 'a view keeps its last frame');
});

test('a hidden mark stays with its place when one view loses a frame', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  numbered(animation);
  setFrameHidden(animation, 2, true);
  removeViewFrame(animation, 'south', 0);

  assert.equal(isFrameHidden(animation, 1), false, 'the moment before it stays shown');
  assert.equal(isFrameHidden(animation, 2), true);
});

// Drawn in Front alone, a frame deleted from Front left its column in the views with nothing
// in them: the loop ran a tick longer, on a frame that was not there to delete.
test('a frame deleted from the one view drawn in takes its empty column along', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  animation.directions.south.frames.forEach((frame) => setPixel(frame.layers[0].sprite, 1, 1, RED));
  removeViewFrame(animation, 'south', 2);

  assert.equal(frameCount(animation), 2, 'the views with nothing drawn lose their last frame too');

  setPixel(animation.directions.east.frames[1].layers[0].sprite, 1, 1, RED);
  removeViewFrame(animation, 'south', 1);

  assert.equal(frameCount(animation), 2, 'a frame drawn in another view stays');
});

// the frame after it, hidden from play, came back into play: the mark stayed with a column
// that was then dropped
test('a hidden frame stays hidden when an earlier frame goes from the one view drawn in', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  animation.directions.south.frames.forEach((frame, i) =>
    setPixel(frame.layers[0].sprite, i, 0, RED),
  );
  setFrameHidden(animation, 2, true);
  removeViewFrame(animation, 'south', 1);

  assert.deepEqual(order(animation, 'south'), [0, 2]);
  assert.equal(isFrameHidden(animation, 1), true, 'the frame that was third is still hidden');
  assert.equal(isFrameHidden(animation, 0), false);
});

test('deleting from every view spares a view down to its last frame', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  removeViewFrame(animation, 'south', 0);
  removeFrame(animation, 0);

  assert.deepEqual(counts(animation), [1, 1, 1]);
});

test('moving a frame leaves no hole in a view too short to have it', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  numbered(animation);
  removeViewFrame(animation, 'south', 2);

  assert.equal(moveFrame(animation, 2, 0), 0);
  assert.deepEqual(order(animation, 'east'), [2, 0, 1]);
  assert.deepEqual(order(animation, 'south'), [0, 1]);
  moveFrame(animation, 0, 2);
  assert.deepEqual(order(animation, 'south'), [1, 0], 'and past its end lands last');
});

test('+ lets a short view catch up alone, and adds to every view once it has', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  removeViewFrame(animation, 'south', 1);

  assert.equal(addFrameAtEnd(project, animation, 'south'), 1);
  assert.deepEqual(counts(animation), [2, 2, 2]);
  assert.equal(addFrameAtEnd(project, animation, 'south'), 2);
  assert.deepEqual(counts(animation), [3, 3, 3]);
});

test('a short view grows with empty frames to reach a frame asked of it', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  removeViewFrame(animation, 'south', 2);
  removeViewFrame(animation, 'south', 1);

  const frame = reachFrame(project, animation, 'south', 2);

  assert.equal(animation.directions.south.frames.length, 3);
  assert.equal(frame, animation.directions.south.frames[2]);
  assert.equal(reachFrame(project, animation, 'south', 0), animation.directions.south.frames[0]);
  assert.equal(animation.directions.south.frames.length, 3);
});

test('a frame copied to the other views reaches a view too short to have it', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  setPixel(art(animation, 'east', 1), 1, 1, RED);
  removeViewFrame(animation, 'south', 1);
  copyFrameToViews(project, animation, 'east', 1);

  assert.equal(getPixel(art(animation, 'south', 1), 1, 1), RED);
});

test('a short view holds its last frame past its end', () => {
  const frames = ['first', 'last'];

  assert.equal(heldFrame(frames, 1), 'last');
  assert.equal(heldFrame(frames, 3), 'last');
});

test('a frame has art when a layer other than a picture to trace has a pixel', async () => {
  const { hasArt } = await import('../../src/model/frames.js');
  const project = newProject({ width: 8, height: 8 });
  const frame = project.animations[0].directions.south.frames[0];

  assert.equal(hasArt(frame), false);
  frame.layers[0].kind = 'reference';
  setPixel(frame.layers[0].sprite, 1, 1, RED);
  assert.equal(hasArt(frame), false);
  frame.layers[0].kind = 'art';
  assert.equal(hasArt(frame), true);
});

test('a new animation is offered untaken names and the drawn poses, the open one first', async () => {
  const { nameSuggestions, posesToStartFrom, startAnimation } =
    await import('../../src/model/animations.js');
  const project = newProject({ kind: 'character', width: 8, height: 8 });
  const [idle] = project.animations;
  const walk = startAnimation(project, idle, { name: 'Walk' });
  const run = startAnimation(project, idle, { name: 'Run' });

  setPixel(idle.directions.south.frames[0].layers[0].sprite, 1, 1, RED);
  setPixel(run.directions.south.frames[0].layers[0].sprite, 1, 1, RED);

  assert.deepEqual(nameSuggestions(project), ['Jump', 'Attack', 'Hurt']);
  assert.deepEqual(posesToStartFrom(project, run), [run, idle]);
  assert.ok(!posesToStartFrom(project, walk).includes(walk));
});
