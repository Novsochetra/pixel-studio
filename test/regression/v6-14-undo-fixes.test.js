import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { newProject } from '../../src/model/new-project.js';
import { withCanvasSize } from '../../src/model/canvas-size.js';
import { renameStored } from '../../src/store/stored-project.js';
import { applyCut } from '../../src/model/body/body.js';
import { bodyOf } from '../../src/model/body/body-kind.js';
import { cloneSprite, createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { cutCharacter } from '../unit/body-helpers.js';

const GREEN = pack(0, 200, 0);

// a canvas of another size, or a version gone back to, started the undo history afresh: neither
// could be undone, and nothing before it either
test('a project put in another’s place is a step that undo and redo cross', () => {
  const before = newProject({ kind: 'icon', width: 16, height: 16 });
  const after = withCanvasSize(before, { width: 32, height: 32 }, { x: 0.5, y: 0.5 });
  const history = new History(() => null);

  history.recordSetting('Guides', 'guides', [], []);
  history.recordProject(
    'Canvas size',
    { before, after },
    { before: { zoom: 4 }, after: { zoom: 2 } },
  );

  const undone = history.undo(after);

  assert.equal(undone.kind, 'project');
  assert.equal(undone.before, before, 'the project as it was is handed back whole');
  assert.deepEqual(undone.view.before, { zoom: 4 });
  assert.equal(after.canvas.width, 32, 'and the one put in its place is left as it was');
  assert.equal(history.canUndo, true, 'what was done before it can still be undone');
  assert.equal(history.redo(before).after, after);
});

// a project could be renamed only while it was the open one
test('a saved project is renamed where it is saved, and in the list', async () => {
  const docs = new Map([['p-1-project', { json: JSON.stringify({ id: '1', name: 'Hero' }) }]]);
  const backend = {
    read: async (key) => docs.get(key) ?? null,
    write: async (key, value) => docs.set(key, value),
  };
  const entry = { id: '1', name: 'Hero', prefix: 'p-1-' };

  assert.equal(await renameStored(backend, entry, 'Striker'), true);
  assert.equal(JSON.parse(docs.get('p-1-project').json).name, 'Striker');
  assert.equal(entry.name, 'Striker');
  assert.equal(await renameStored(backend, { id: '2', prefix: 'p-2-' }, 'Ghost'), false);
});

// a set of icons named Gem began with an icon called Coin, and its files were coin.png
test('the first icon or tile of a named project takes the project’s name', () => {
  const named = (options) => newProject(options).animations[0].name;

  assert.equal(named({ kind: 'icon', name: 'Gem' }), 'Gem');
  assert.equal(named({ kind: 'tile', name: 'Castle floor' }), 'Castle floor');
  assert.equal(named({ kind: 'icon' }), 'Coin', 'one with no name of its own keeps the usual');
  assert.equal(named({ kind: 'character', name: 'Hero' }), 'Idle', 'an animation is not the art');
});

// A first cut gives every frame of every view a Body. What was drawn on the Body of a view not
// cut yet was thrown away when that view was cut in its turn, with no word of it.
test('pixels drawn on a Body before its view is cut are kept, on the layer that was cut', () => {
  const { project, animation, source, rig } = cutCharacter();
  const side = animation.directions.east.frames[0];
  const body = bodyOf(side);
  const art = side.layers.find((layer) => layer !== body);

  setPixel(body.sprite, 2, 2, GREEN);
  art.sprite = cloneSprite(source);
  applyCut(project, animation, {
    direction: 'east',
    frame: 0,
    layerKey: art.key,
    source,
    leftover: createSprite(160, 160),
    rig,
  });

  assert.equal(Boolean(body.pose), true, 'the Body is posed from the cut');
  assert.equal(getPixel(art.sprite, 2, 2), GREEN, 'and what was on it is on the art under it');
});

// a canvas made smaller left a guide line on a row the canvas no longer had: its row in Guides
// showed a number the field would not take, and the line was drawn nowhere
test('a guide line stays on the canvas when the canvas is made smaller', () => {
  const project = newProject({ kind: 'character', width: 32, height: 32 });

  project.guides[0].row = 30;
  const smaller = withCanvasSize(project, { width: 16, height: 16 }, { x: 0.5, y: 0 });

  assert.equal(smaller.guides[0].row, 15);
});
