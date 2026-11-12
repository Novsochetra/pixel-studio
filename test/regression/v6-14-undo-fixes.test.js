import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { newProject } from '../../src/model/new-project.js';
import { withCanvasSize } from '../../src/model/canvas-size.js';
import { renameStored } from '../../src/store/stored-project.js';
import { applyCut, cutSource } from '../../src/model/body/body.js';
import { bodyOf } from '../../src/model/body/body-kind.js';
import { cloneSprite, createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { cutCharacter } from '../unit/body-helpers.js';
import { BODY_PARTS } from '../../src/model/kinds.js';
import { guessOwners } from '../../src/model/body/guess.js';
import { cutIntoParts, leftOver } from '../../src/model/body/cut.js';
import { viewBox } from '../../src/ui/body/cut-view.js';
import { isPose } from '../../src/model/reference.js';
import { cleanAtViewScale, scaleOf, scalesAfter } from '../../src/ui/import/view-scale.js';

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
  // called Coin, a sword drawn in a project left unnamed was saved as coin.png
  assert.equal(named({ kind: 'icon' }), 'Icon 1', 'one with no name of its own is numbered');
  assert.equal(named({ kind: 'tile' }), 'Tile 1');
  assert.equal(named({ kind: 'character', name: 'Hero' }), 'Idle', 'an animation is not the art');
});

// A first cut gives every frame of every view a Body. What was drawn on the Body of a view not
// cut yet was thrown away when that view was cut in its turn; put under the parts instead, it
// was hidden by them. It is part of what is cut.
test('pixels drawn on a Body before its view is cut are in the picture after the cut', () => {
  const { project, animation, source } = cutCharacter();
  const side = animation.directions.east.frames[0];
  const body = bodyOf(side);
  const art = side.layers.find((layer) => layer !== body);

  art.sprite = cloneSprite(source);
  setPixel(body.sprite, 80, 60, GREEN);
  const from = cutSource(side, art);
  const owners = guessOwners(from, BODY_PARTS);

  applyCut(project, animation, {
    direction: 'east',
    frame: 0,
    layerKey: art.key,
    source: from,
    art: art.sprite,
    leftover: leftOver(from, owners),
    rig: cutIntoParts(from, owners, BODY_PARTS),
  });

  assert.equal(Boolean(body.pose), true, 'the Body is posed from the cut');
  assert.equal(getPixel(body.sprite, 80, 60), GREEN, 'and shows what was drawn on it');
});

// a part removed from a cut, or pixels unpainted in it, were dropped from the picture
test('what an edited cut no longer holds goes back to the art of the frame', () => {
  const { project, animation, front, rig } = cutCharacter();
  const leftover = createSprite(160, 160);

  setPixel(leftover, 5, 5, GREEN);
  applyCut(project, animation, { direction: 'south', frame: 0, rig, leftover });

  assert.equal(getPixel(front.frames[0].layers[0].sprite, 5, 5), GREEN);
});

// a canvas made smaller left a guide line on a row the canvas no longer had: its row in Guides
// showed a number the field would not take, and the line was drawn nowhere
test('a guide line stays on the canvas when the canvas is made smaller', () => {
  const project = newProject({ kind: 'character', width: 32, height: 32 });

  project.guides[0].row = 30;
  const smaller = withCanvasSize(project, { width: 16, height: 16 }, { x: 0.5, y: 0 });

  assert.equal(smaller.guides[0].row, 15);
});

// the art in the cut window was drawn for a desk's room and squeezed into a phone's by the
// stylesheet: squashed, with the brush painting beside the finger
test('the art to cut is sized for the window it is in, not shrunk after', () => {
  const art = createSprite(160, 160);

  for (let y = 30; y < 130; y++) {
    setPixel(art, 80, y, GREEN);
  }

  const phone = viewBox(art, { innerWidth: 390, innerHeight: 664 });
  const small = viewBox(art, { innerWidth: 320, innerHeight: 568 });
  const desk = viewBox(art, { innerWidth: 1440, innerHeight: 900 });

  assert.ok(phone.height * phone.scale <= 664 * 0.34, 'a phone leaves the parts their share');
  assert.ok(small.scale >= 1 && small.height * small.scale <= 568 * 0.34);
  assert.equal(desk.scale, 3);
});

// With three pixels sketched in the reference view, a picture cleaned into another view was
// matched to a pose one pixel tall: it could not be cleaned, and the message blamed the picture.
test('a few pixels sketched in the reference view are no pose to match a picture to', () => {
  const sketch = createSprite(64, 64);
  const figure = createSprite(64, 64);

  for (let x = 10; x < 13; x++) {
    setPixel(sketch, x, 10, GREEN);
  }

  for (let y = 12; y < 60; y++) {
    setPixel(figure, 30, y, GREEN);
  }

  assert.equal(isPose(sketch), false);
  assert.equal(isPose(createSprite(64, 64)), false);
  assert.equal(isPose(null), false);
  assert.equal(isPose(figure), true);
});

// A view's second picture kept its own pixel size, though the first was scaled to stand as tall
// as the reference: the same file cleaned into frame 2 came out a quarter smaller than in frame 1.
test('a later frame of a view is cleaned at the scale its first frame was matched at', async () => {
  const asked = [];
  const clean = async (options) => {
    asked.push(options);

    return options.keepScale
      ? { report: { kept: true, size: [36, 75], scaled: null } }
      : { report: { kept: false, size: [47, 98], scaled: { fy: 1.31 } } };
  };
  const scales = scalesAfter({}, 'north', (await clean({})).report);
  const later = await cleanAtViewScale(clean, { keepScale: true }, scaleOf(scales, 'north'));

  assert.deepEqual(scales, { north: 1.31 });
  assert.equal(asked.at(-1).height, 98, 'its own 75 rows, by the view’s 1.31');
  assert.equal(later.report.kept, false);
  assert.equal(
    scaleOf(scales, 'east'),
    1,
    'a view with no picture matched yet keeps pixels as they are',
  );
});
