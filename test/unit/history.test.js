import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { snapshotAnimations } from '../../src/editor/snapshots.js';
import { allLayers } from '../../src/model/project.js';
import { newProject } from '../../src/model/new-project.js';
import { addFrame, removeFrame } from '../../src/model/frames.js';
import { cloneSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';

const RED = pack(255, 0, 0);

test('a deleted frame comes back with undo, and older pixel undos still land', () => {
  const project = newProject();
  const find = (id) => [...allLayers(project)].find(({ layer }) => layer.id === id)?.layer ?? null;
  const history = new History(find);
  const animation = () => project.animations[0];

  const layer = animation().directions.south.frames[0].layers[0];
  const before = cloneSprite(layer.sprite);
  setPixel(layer.sprite, 3, 3, RED);
  history.record('Pencil', [{ layer, before }]);

  let snap = snapshotAnimations(project.animations);
  addFrame(project, animation(), 0, true);
  history.recordStructure('Duplicate frame', snap, project);
  assert.equal(animation().directions.south.frames.length, 2);

  snap = snapshotAnimations(project.animations);
  removeFrame(animation(), 1);
  history.recordStructure('Delete frame', snap, project);
  assert.equal(animation().directions.south.frames.length, 1);

  history.undo(project);
  assert.equal(animation().directions.south.frames.length, 2, 'the deleted frame is back');
  assert.equal(getPixel(animation().directions.south.frames[1].layers[0].sprite, 3, 3), RED);

  history.undo(project);
  history.undo(project);
  assert.equal(
    getPixel(animation().directions.south.frames[0].layers[0].sprite, 3, 3),
    0,
    'the pixel undo reached the rebuilt layer',
  );

  history.redo(project);
  assert.equal(getPixel(animation().directions.south.frames[0].layers[0].sprite, 3, 3), RED);
});

test('read again from saved work, a step that swapped whole projects swaps to the one now open', () => {
  const small = newProject({ width: 8, height: 8 });
  const grown = newProject({ width: 16, height: 16 });
  const history = new History(() => null);

  history.openOn(small);
  history.recordProject('Canvas size', { before: small, after: grown });
  history.openOn(grown);
  history.recordSetting('Reference view', 'reference', 'south', 'east');

  const reread = newProject({ width: 16, height: 16 });

  history.openOn(reread, true);
  history.undo(reread);

  const swap = history.undo(reread);

  assert.equal(swap.label, 'Canvas size', 'undo still goes back past the swap');
  assert.equal(swap.before, small);
  assert.equal(swap.after, reread, 'and redo leads to the project that was read again');
});

test('a swap waiting to be redone is pointed at the project read again too', () => {
  const small = newProject({ width: 8, height: 8 });
  const grown = newProject({ width: 16, height: 16 });
  const history = new History(() => null);

  history.openOn(small);
  history.recordProject('Canvas size', { before: small, after: grown });
  history.openOn(grown);
  history.undo(grown);
  history.openOn(small);

  const reread = newProject({ width: 8, height: 8 });

  history.openOn(reread, true);

  const swap = history.redo(reread);

  assert.equal(swap.before, reread);
  assert.equal(swap.after, grown);
});

test('a project that takes another’s place in the same visit repoints nothing', () => {
  const small = newProject({ width: 8, height: 8 });
  const grown = newProject({ width: 16, height: 16 });
  const history = new History(() => null);

  history.openOn(small);
  history.recordProject('Canvas size', { before: small, after: grown });
  history.openOn(grown);

  const swap = history.undo(grown);

  assert.equal(swap.before, small);
  assert.equal(swap.after, grown);
});

test('a run of the same step joins into one: undo goes back to before the first of them', () => {
  const project = newProject({ width: 8, height: 8 });
  const find = (id) => [...allLayers(project)].find(({ layer }) => layer.id === id)?.layer ?? null;
  const history = new History(find);
  const layer = project.animations[0].directions.south.frames[0].layers[0];
  const step = (label, x) => {
    const before = cloneSprite(layer.sprite);

    setPixel(layer.sprite, x, 0, RED);
    history.record(label, [{ layer, before }]);
  };

  step('Pencil', 0);
  step('Move', 1);
  step('Move', 2);
  assert.equal(history.joinLast(), true);
  step('Move', 3);
  assert.equal(history.joinLast(), true);

  history.undo(project);
  assert.equal(getPixel(layer.sprite, 1, 0), 0, 'the whole run is taken back at once');
  assert.equal(getPixel(layer.sprite, 0, 0), RED, 'and the step before it is left');
  history.redo(project);
  assert.equal(getPixel(layer.sprite, 3, 0), RED, 'and redone at once');

  assert.equal(history.joinLast(), false, 'a step of another name is not joined to');
});
