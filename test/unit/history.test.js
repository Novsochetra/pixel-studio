import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History, snapshotAnimations } from '../../src/editor/history.js';
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
