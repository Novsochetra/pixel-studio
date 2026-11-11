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

test('read again from saved work, a project keeps the steps made since a whole project took its place', () => {
  const project = newProject();
  const find = (id) => [...allLayers(project)].find(({ layer }) => layer.id === id)?.layer ?? null;
  const history = new History(find);
  const layer = project.animations[0].directions.south.frames[0].layers[0];
  const draw = (label, x) => {
    const before = cloneSprite(layer.sprite);

    setPixel(layer.sprite, x, 0, RED);
    history.record(label, [{ layer, before }]);
  };

  draw('first', 0);
  history.recordProject('Canvas size', { before: project, after: project });
  draw('second', 1);
  draw('third', 2);
  history.undo(project);
  history.sinceReread();

  assert.equal(history.nextUndo, 'second', 'the steps since are kept');
  history.undo(project);
  assert.equal(history.canUndo, false, 'the swap, and what came before it, are let go');
  history.redo(project);
  history.redo(project);
  assert.equal(getPixel(layer.sprite, 2, 0), RED, 'and what was undone is still redone');
});

test('a whole project waiting to be redone is let go with what would follow it', () => {
  const project = newProject();
  const find = (id) => [...allLayers(project)].find(({ layer }) => layer.id === id)?.layer ?? null;
  const history = new History(find);
  const layer = project.animations[0].directions.south.frames[0].layers[0];
  const before = cloneSprite(layer.sprite);

  setPixel(layer.sprite, 0, 0, RED);
  history.record('first', [{ layer, before }]);
  history.recordProject('Canvas size', { before: project, after: project });
  history.recordSetting('Reference view', 'reference', 'south', 'east');
  history.undo(project);
  history.undo(project);
  history.sinceReread();

  assert.equal(history.canRedo, false);
  assert.equal(history.nextUndo, 'first');
});
