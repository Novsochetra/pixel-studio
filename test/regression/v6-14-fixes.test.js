import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { snapshotAnimations } from '../../src/editor/snapshots.js';
import { newProject } from '../../src/model/new-project.js';
import { addFrame, removeViewFrame } from '../../src/model/frames.js';
import { setFrameHidden } from '../../src/model/frame-play.js';
import { startAnimation } from '../../src/model/animations.js';
import { pinsOf, setPin } from '../../src/model/pins.js';
import { CLEAR, createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { floodFill, replaceColor } from '../../src/editor/paint.js';
import { inWords, told } from '../../src/model/told.js';
import { swapSaid } from '../../src/ui/swap/swap-said.js';
import { frameIndexes } from '../../src/ui/batch/batch-items.js';
import { keepsOwnSize } from '../../src/ui/import/import-options.js';
import { addFolder, renameFolder } from '../../src/store/folders.js';
import { readProjectBundle } from '../../src/store/project-file.js';
import { cutCharacter } from '../unit/body-helpers.js';

const RED = pack(255, 0, 0);

// Duplicate frame copied the layers and left the pins behind
test('a duplicated frame keeps its pins', () => {
  const project = newProject({ kind: 'character', width: 16, height: 16 });
  const animation = project.animations[0];
  const [view] = Object.values(animation.directions);

  setPin(view.frames[0], 'Head', 8, 2);
  addFrame(project, animation, 0, true);

  assert.deepEqual(pinsOf(view.frames[1]), [{ name: 'Head', x: 8, y: 2 }]);
  setPin(view.frames[1], 'Head', 1, 1);
  assert.deepEqual(pinsOf(view.frames[0]), [{ name: 'Head', x: 8, y: 2 }], 'a copy of its own');
});

// with one view, deleting a frame left "hidden from play" on the place, so it hid the next frame
test('in a project of one view, a frame hidden from play stays hidden when another is deleted', () => {
  const project = newProject({ kind: 'icon', width: 8, height: 8 });
  const animation = project.animations[0];
  const [direction] = Object.keys(animation.directions);
  const { frames } = animation.directions[direction];

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  const [, second, third] = frames;

  setFrameHidden(animation, 1, true);
  removeViewFrame(animation, direction, 0);

  assert.equal(frames.length, 2);
  assert.equal(frames[0], second);
  assert.equal(frames[0].hidden, true, 'the hidden frame is still the hidden one');
  assert.ok(!third.hidden);
});

// frames started from a cut pose copied frame 1 whole: hidden from play, pins and all
test('an animation started from a cut pose plays every frame and has no pins of the pose', () => {
  const { project, animation, front } = cutCharacter();

  setFrameHidden(animation, 0, true);
  setPin(front.frames[0], 'Head', 80, 30);
  const started = startAnimation(project, animation, { name: 'Run', frames: 3, start: 'pose' });

  for (const entry of Object.values(started.directions)) {
    assert.equal(entry.frames.length, 3);
    assert.ok(entry.frames.every((frame) => !frame.hidden));
    assert.ok(entry.frames.every((frame) => !pinsOf(frame).length));
  }
});

// a frame dropped on itself, or Alt+← on the first frame, left "Undone: Move frame" steps that
// undid nothing and threw the redo away
test('a change that changes nothing is no undo step, and keeps what can be redone', () => {
  const project = newProject({ kind: 'icon', width: 8, height: 8 });
  const history = new History(() => null);
  const start = snapshotAnimations(project.animations);

  addFrame(project, project.animations[0], 0);
  assert.equal(history.recordStructure('New frame', start, project), true);
  history.undo(project);
  assert.equal(history.canRedo, true);

  const before = snapshotAnimations(project.animations);

  assert.equal(history.recordStructure('Move frame', before, project), false);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true, 'the redo is still there');

  // undo put a copy of the animations back, so the sprite is looked up afresh
  const { sprite } = Object.values(project.animations[0].directions)[0].frames[0].layers[0];

  setPixel(sprite, 1, 1, RED);
  assert.equal(history.recordStructure('Paint', before, project), true, 'pixels count as a change');
});

// a mark drawn on the Views board after an undo was pushed into the undo step's own copy
test('a setting put back by undo is a copy: changing it leaves the step as it was', () => {
  const project = newProject({ kind: 'icon', width: 8, height: 8 });
  const history = new History(() => null);
  const none = { strokes: [], notes: [] };
  const one = { strokes: [], notes: [{ direction: 'south', x: 1, y: 1, text: 'fix' }] };

  project.markup = structuredClone(one);
  history.recordSetting('Note', 'markup', none, one);
  history.undo(project);
  assert.deepEqual(project.markup, none);
  project.markup.notes.push({ direction: 'south', x: 2, y: 2, text: 'again' });
  history.redo(project);
  history.undo(project);
  assert.deepEqual(project.markup, none, 'the step still holds what it held');
});

// with "Paint only over" set to one colour, Fill and Replace colour still changed any other
test('Fill and Replace colour keep to the colour "Paint only over" names', () => {
  const sprite = createSprite(4, 4);
  const blue = pack(0, 0, 255);

  setPixel(sprite, 0, 0, RED);
  setPixel(sprite, 3, 3, blue);

  assert.equal(floodFill(sprite, [1, 1], blue, { paintOver: RED }).length, 0);
  assert.equal(getPixel(sprite, 1, 1), CLEAR, 'a clear pixel is not the colour named');
  assert.equal(floodFill(sprite, [0, 0], blue, { paintOver: RED }).length, 1);
  assert.equal(getPixel(sprite, 0, 0), blue, 'the colour named is filled');

  assert.equal(replaceColor(sprite, blue, RED, { paintOver: RED }), 0);
  assert.equal(replaceColor(sprite, blue, RED, { paintOver: blue }), 2);
});

// a failure showed the browser's own words to the person: "QuotaExceededError", "x is undefined"
test('a message says the studio’s own sentence, and plain words for any other error', async () => {
  const fallback = 'The file could not be made.';

  assert.equal(inWords(told('Height is a number.'), fallback), 'Height is a number.');
  assert.equal(inWords(new TypeError('x is undefined'), fallback), fallback);
  assert.equal(inWords(undefined, fallback), fallback);

  const refused = await readProjectBundle('not a project').catch((error) => error);

  assert.equal(refused.told, true, 'a file that is no project says so in its own sentence');
});

// two folders could be given the same name, and then told apart only by where they stood
test('a folder renamed to another folder’s name is numbered, so the two stay apart', () => {
  const index = { list: [], folders: [] };
  const heroes = addFolder(index, 'Heroes');
  const other = addFolder(index);

  renameFolder(index, other.id, 'Heroes');
  assert.equal(other.name, 'Heroes 2');
  renameFolder(index, heroes.id, 'Heroes');
  assert.equal(heroes.name, 'Heroes', 'a folder keeps its own name');
});

// with "Keep its own pixel size" picked, a height typed for the cleaning was left unused
test('a height typed for a cleaning wins over keeping the picture’s own pixel size', () => {
  assert.equal(keepsOwnSize('keep', null), true);
  assert.equal(keepsOwnSize('keep', 48), false);
  assert.equal(keepsOwnSize('match', null), false);
  assert.equal(keepsOwnSize(undefined, null), false, 'cleaned alone, there is no choice of size');
});

// two images set to the same view and frame: the second took the place of the first, unseen
test('two images cleaned for one view and frame both land: the later takes a new frame', () => {
  const items = [
    { direction: 'south', placement: '0' },
    { direction: 'south', placement: '0' },
    { direction: 'east', placement: '0' },
    { direction: 'south', placement: 'new' },
  ];

  assert.deepEqual(frameIndexes(items, 2), [0, 2, 0, 3]);
});

// a swap on art that has none of its colours said "Colours swapped", with nothing changed
test('a swap that changed nothing says so', () => {
  assert.match(swapSaid({ changed: false, everywhere: true }), /^No colour changed/);
  assert.match(swapSaid({ changed: true, everywhere: true }), /^Colours swapped across/);
  assert.match(swapSaid({ changed: true, flattened: true }), /plain pixels$/);
});
