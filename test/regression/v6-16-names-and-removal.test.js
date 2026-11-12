import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { freeName } from '../../src/model/free-name.js';
import { newProject } from '../../src/model/new-project.js';
import { rename, takeOff } from '../../src/ui/put-back.js';

// a project file opened twice, or a copy made twice, gave two rows of one name in Projects
test('a name already in the list is numbered, and a free one is kept', () => {
  assert.equal(freeName('Hero', []), 'Hero');
  assert.equal(freeName('Hero', ['Hero']), 'Hero 2');
  assert.equal(freeName('Hero', ['Hero', 'Hero 2', 'Villain']), 'Hero 3');
});

function appOf(project) {
  const touched = [];

  return {
    touched,
    store: { state: { project }, touch: (what) => touched.push(what) },
    saver: { markStructure() {} },
    history: new History(() => null),
  };
}

// Removing a part or an outfit asked first, as undo could not bring it back, while removing a
// palette in the window beside it did not ask. All three are steps now.
test('a part taken off the project is a step that undo brings back in its place', () => {
  const project = newProject({ kind: 'character' });

  project.parts = [
    { id: 'a', name: 'Shirt', colours: [] },
    { id: 'b', name: 'Cape', colours: [] },
    { id: 'c', name: 'Boots', colours: [] },
  ];
  const app = appOf(project);
  const taken = {};

  takeOff(app, { key: 'parts', item: project.parts[1], taken });

  assert.deepEqual(
    project.parts.map((part) => part.name),
    ['Shirt', 'Boots'],
  );
  assert.equal(taken.parts.index, 1, 'the window remembers where it stood, to offer it back');
  assert.equal(app.history.canUndo, true);

  app.history.undo(project);

  assert.deepEqual(
    project.parts.map((part) => part.name),
    ['Shirt', 'Cape', 'Boots'],
  );
});

// removing a part was a step and renaming one was not: undo passed over the new name
test('a part renamed is a step, and a name left as it was is none', () => {
  const project = newProject({ kind: 'character' });

  project.parts = [{ id: 'a', name: 'Shirt', colours: [] }];
  const app = appOf(project);

  rename(app, { key: 'parts', item: project.parts[0], name: 'Shirt' });
  rename(app, { key: 'parts', item: project.parts[0], name: '' });
  assert.equal(app.history.canUndo, false);

  rename(app, { key: 'parts', item: project.parts[0], name: 'Jersey' });
  assert.equal(project.parts[0].name, 'Jersey');

  app.history.undo(project);
  assert.equal(project.parts[0].name, 'Shirt');
});

// a layer moved three places with Alt and the arrows was three steps to undo
test('a run of moves of one layer is one step to undo', async () => {
  const { placeLayer } = await import('../../src/model/layer-ops.js');
  const { snapshotAnimations } = await import('../../src/editor/snapshots.js');
  const project = newProject({ kind: 'character' });
  const frame = project.animations[0].directions.south.frames[0];
  const history = new History(() => null);
  const names = () => frame.layers.map((layer) => layer.name).join();
  const move = (to) => {
    const before = snapshotAnimations(project.animations);

    placeLayer(frame, frame.layers.find((layer) => layer.name === 'Top').key, to);
    history.recordStructure('Move layer', before, project);
  };

  frame.layers.push(
    { ...structuredClone(frame.layers[0]), key: 'mid', name: 'Mid' },
    { ...structuredClone(frame.layers[0]), key: 'top', name: 'Top' },
  );
  const stacked = names();

  move(1);
  move(0);
  assert.equal(history.joinLast(), true, 'the second move joins the first');
  assert.equal(history.done.length, 1);

  history.undo(project);
  assert.equal(
    project.animations[0].directions.south.frames[0].layers.map((layer) => layer.name).join(),
    stacked,
    'and one undo puts the layer back where the run began',
  );
});

// "Fit the art" made a full 32 pixel icon a 35×34 frame, its art off the middle, and an icon
// with a few pixels near its top a 31×16 one
test('an icon’s sprite sheet frame is its canvas, the art where it was drawn', async () => {
  const { presetSettings, presetsFor } = await import('../../src/ui/export-settings.js');
  const { setPixel, pack } = await import('../../src/model/sprite.js');
  const project = newProject({ kind: 'icon', width: 32, height: 32 });
  const sprite = project.animations[0].directions.south.frames[0].layers[0].sprite;

  setPixel(sprite, 10, 2, pack(255, 0, 0));
  setPixel(sprite, 11, 2, pack(255, 0, 0));

  const settings = presetSettings({ project }, 'fit');

  assert.deepEqual(
    [settings.frameWidth, settings.frameHeight, settings.anchorX, settings.anchorY],
    [32, 32, 16, 16],
  );
  assert.deepEqual(settings.artAnchor, { x: 16, y: 16 }, 'every pixel lands where it was drawn');
  assert.equal(presetsFor(project)[0][1], 'The canvas');
});

// "back" read inside "no-background" sent a front view to the back
test('a picture’s view is read from whole words of its name', async () => {
  const { namedDirection } = await import('../../src/ui/batch/batch-items.js');

  assert.equal(namedDirection('knight-front-no-background.png'), 'south');
  assert.equal(namedDirection('knight-back.png'), 'north');
  assert.equal(namedDirection('knight_side_2.webp'), 'east');
  assert.equal(namedDirection('back2.webp'), 'north');
  assert.equal(namedDirection('sideways-inside.png'), null);
  assert.equal(namedDirection('front-side-left.png'), 'south-west');
  assert.equal(namedDirection('hero1.png'), null);
});

// taking a palette off was a step and adding one was not: undo passed over it
test('a palette added is a step that undo takes off', async () => {
  const { addPaletteStep } = await import('../../src/ui/palette-step.js');
  const project = newProject({ kind: 'character' });
  const app = appOf(project);
  const had = project.palettes.length;

  addPaletteStep(app, { id: 'p-new', name: 'Forest', colors: [1, 2] });
  assert.equal(project.palettes.length, had + 1);

  app.history.undo(project);
  assert.equal(project.palettes.length, had);
});

// after Swap colours a guide that marked the top of the old blue marked nothing
test('a guide that follows a colour follows it to its new one, and back with undo', async () => {
  const { recolourLayers } = await import('../../src/ui/body/recolour.js');
  const { pack, setPixel } = await import('../../src/model/sprite.js');
  const project = newProject({ kind: 'character', width: 8, height: 8 });
  const layer = project.animations[0].directions.south.frames[0].layers[0];
  const [blue, green] = [pack(40, 60, 160), pack(0, 160, 0)];
  const layers = new Map([[layer.id, layer]]);
  const app = appOf(project);

  app.history = new History((id) => layers.get(id));
  app.saver.markLayers = () => {};
  setPixel(layer.sprite, 2, 3, blue);
  project.guides = [{ id: 'g', name: 'Waist', row: 3, rule: 'colour-top', colour: blue }];

  recolourLayers(app, {
    label: 'Swap',
    layers: [layer],
    mapping: { [blue]: green },
    everywhere: true,
  });
  assert.equal(project.guides[0].colour, green);

  app.history.undo(project);
  assert.equal(project.guides[0].colour, blue, 'one undo puts the art and the guide back');
  assert.equal(app.history.canUndo, false);
});
