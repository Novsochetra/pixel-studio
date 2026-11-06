import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { addLayer } from '../../src/model/structure.js';
import { addFrame } from '../../src/model/frames.js';
import { allLayers, newAnimation } from '../../src/model/project.js';
import { setPin } from '../../src/model/pins.js';
import { createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { blankCopy, lineUp, lineUpScale, portraitOf } from '../../src/model/cast.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);

function drawnHero() {
  const project = newProject({ name: 'Hero', width: 32, height: 32 });
  const idle = project.animations[0];
  const run = newAnimation('Run', project.canvas, Object.keys(idle.directions));

  run.fps = 12;
  project.animations.push(run);
  addFrame(project, run, 0);
  addLayer(project, idle, { name: 'Trace', kind: 'reference' });
  addLayer(project, idle, { name: 'Hair' });
  setPin(idle.directions.south.frames[0], 'Hand', 4, 5);
  project.outfits.push({ id: 'o1', name: 'Away', mapping: {} });

  for (const { layer } of allLayers(project)) {
    setPixel(layer.sprite, 3, 3, RED);
  }

  return project;
}

const layerNames = (frame) => frame.layers.map((layer) => layer.name);

// every animation's name and speed, and the layer names of each frame of each view
const shape = (project) =>
  project.animations.map((animation) => [
    animation.name,
    animation.fps,
    Object.entries(animation.directions).map(([direction, entry]) => [
      direction,
      entry.frames.map(layerNames),
    ]),
  ]);

test('a blank copy has the same animations, views, frames and layers, with nothing drawn', () => {
  const hero = drawnHero();
  const copy = blankCopy(hero, 'Villain');

  assert.equal(copy.name, 'Villain');
  assert.notEqual(copy.id, hero.id);
  assert.deepEqual(shape(copy), shape(hero).map(withoutTrace));
  assert.deepEqual(copy.canvas, hero.canvas);
  assert.deepEqual(copy.guides, hero.guides);

  for (const { layer } of allLayers(copy)) {
    assert.equal(layer.sprite.width, 32);
    assert.ok(
      layer.sprite.pixels.every((value) => value === 0),
      `${layer.name} is empty`,
    );
  }
});

function withoutTrace([name, fps, views]) {
  return [
    name,
    fps,
    views.map(([direction, frames]) => [
      direction,
      frames.map((layers) => layers.filter((layer) => layer !== 'Trace')),
    ]),
  ];
}

test('a blank copy leaves the other character its pins, outfits and pixels', () => {
  const hero = drawnHero();
  const copy = blankCopy(hero, 'Villain');

  assert.deepEqual(copy.outfits, []);
  assert.equal(copy.animations[0].directions.south.frames[0].marks, undefined);
  assert.equal(hero.animations[0].directions.south.frames[0].marks.length, 1);
  assert.equal(getPixel(hero.animations[0].directions.south.frames[0].layers[0].sprite, 3, 3), RED);
});

test("a project's portrait is its reference view's first frame, cut to the art", () => {
  const project = newProject({ name: 'Hero', width: 32, height: 32 });
  const frame = project.animations[0].directions.south.frames[0];

  assert.equal(portraitOf(project), null, 'nothing drawn: no portrait');
  setPixel(frame.layers[0].sprite, 10, 20, RED);
  setPixel(frame.layers[0].sprite, 12, 25, BLUE);
  const portrait = portraitOf(project);

  assert.deepEqual([portrait.width, portrait.height], [3, 6]);
  assert.equal(getPixel(portrait, 0, 0), RED);
  assert.equal(getPixel(portrait, 2, 5), BLUE);
});

test('a line-up stands every picture on one line, a gap apart', () => {
  const tall = createSprite(2, 4);
  const short = createSprite(3, 2);

  setPixel(tall, 0, 3, RED);
  setPixel(short, 0, 0, BLUE);
  const row = lineUp([tall, short], 1);

  assert.deepEqual([row.width, row.height], [6, 4]);
  assert.equal(getPixel(row, 0, 3), RED);
  assert.equal(getPixel(row, 3, 2), BLUE, 'the short one stands on the same line');
  assert.deepEqual([lineUp([], 2).width, lineUp([], 2).height], [0, 0]);
  assert.equal(lineUpScale([tall, short], 13), 3);
  assert.equal(lineUpScale([createSprite(4, 400)], 100), 1, 'never below 1');
});
