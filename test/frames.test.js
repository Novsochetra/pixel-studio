import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../src/model/new-project.js';
import { getPixel, pack, setPixel } from '../src/model/sprite.js';
import { addFrame, evenFrames, frameCount, moveFrame, removeFrame } from '../src/model/frames.js';
import { addDirection, removeDirection } from '../src/model/structure.js';
import { fillMissingSprites, install } from '../src/ui/session.js';

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

test("an older project with uneven views is evened out with copies of each short view's last frame", () => {
  const project = newProject();
  const animation = project.animations[0];
  setPixel(art(animation, 'east', 0), 1, 1, RED);
  animation.directions.south.frames.push(structuredClone(animation.directions.south.frames[0]));
  animation.directions.south.frames.push(structuredClone(animation.directions.south.frames[0]));
  const added = evenFrames(project);
  assert.deepEqual(counts(animation), [3, 3, 3]);
  assert.equal(added.length, 4);
  assert.equal(getPixel(art(animation, 'east', 2), 1, 1), RED);
  assert.deepEqual(evenFrames(project), [], 'an even project is left alone');
});

test('frames added to even out a loaded project are saved, so they never come back empty', () => {
  const project = newProject();
  delete project.id;
  const animation = project.animations[0];
  animation.directions.south.frames.push(structuredClone(animation.directions.south.frames[0]));
  fillMissingSprites(project);
  const added = animation.directions.east.frames[1].layers.map((layer) => layer.id);
  const app = {
    store: { state: {}, set() {} },
    backend: {
      async read() {
        return null;
      },
      async write() {},
      async remove() {},
    },
    index: { list: [], current: null },
  };
  install(app, project, '', 'nothing');
  added.forEach((id) => assert.ok(app.saver.dirty.has(id)));
  assert.equal(app.saver.structureDirty, true);
  app.saver.detach();
});
