import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { newProject } from '../../src/model/new-project.js';
import { normalizeProject } from '../../src/model/normalize.js';
import { install } from '../../src/ui/session.js';

// choosing the reference view was not undoable, so the undo after it undid the step before
test('choosing the reference view is its own undo step', () => {
  const project = newProject();
  const history = new History(() => null);
  history.recordSetting('Reference view', 'referenceDirection', 'south', 'east');
  project.referenceDirection = 'east';
  history.undo(project);
  assert.equal(project.referenceDirection, 'south');
  history.redo(project);
  assert.equal(project.referenceDirection, 'east');
});

// going back to a version reset the zoom, tools, pins and the frame being edited
test('a version restored keeps how the editor was showing things', () => {
  const project = newProject();
  const state = {
    zoom: 9,
    tool: 'eraser',
    showPins: true,
    viewFilter: 'grey',
    gridAll: true,
    mode: 'board',
    at: { animation: project.animations[0].id, direction: 'east', frame: 0, layer: null },
  };
  const app = {
    store: { state, set: (patch) => Object.assign(state, patch) },
    backend: {
      async read() {
        return null;
      },
      async write() {},
      async remove() {},
    },
    index: { list: [], current: null },
    keys: { prefix: 'p-x-' },
  };
  install(app, project, { prefix: 'p-x-', save: 'all', keepView: true });
  assert.equal(state.zoom, 9);
  assert.equal(state.tool, 'eraser');
  assert.equal(state.showPins, true);
  assert.equal(state.at.direction, 'east');
  install(app, project, { prefix: 'p-x-', save: 'all' });
  assert.equal(state.zoom, 4, 'opening a project starts its view afresh');
  app.saver.detach();
});

// with ⌘ or Ctrl held, only the ⌘ keys were looked up, so ⌘⌫ and ⌘Esc did nothing to a selection
test('⌘ Esc lets go of a selection, as Esc does', async () => {
  const { handleSelectionKey } = await import('../../src/ui/selection-keys.js');
  const state = { selection: { width: 1, height: 1, cells: [1] }, tool: 'select' };
  const app = { store: { state, set: (patch) => Object.assign(state, patch) } };
  let prevented = false;
  const event = { shiftKey: false, preventDefault: () => (prevented = true) };

  assert.equal(handleSelectionKey(app, event, 'escape', true), true);
  assert.equal(state.selection, null);
  assert.equal(prevented, true);
});

// art the size of a tile canvas, drawn inside a margin, kept the margin and lost its far edges
test('tile art the canvas size, inside a margin, fills the canvas edge to edge', async () => {
  const { cleanAlone } = await import('../../src/clean/alone.js');
  const { bbox } = await import('../../src/clean/layout.js');
  const colours = [
    [60, 140, 60],
    [120, 80, 40],
    [200, 190, 90],
    [30, 30, 30],
  ];
  const cell = 5;
  const side = 20 * cell;
  const data = new Uint8ClampedArray(side * side * 4);

  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const [col, row] = [Math.floor(x / cell) - 2, Math.floor(y / cell) - 2];
      const inside = col >= 0 && row >= 0 && col < 16 && row < 16;
      const colour = inside
        ? colours[(Math.floor(col / 3) + Math.floor(row / 2)) % 4]
        : [255, 0, 255];
      data.set([...colour, 255], (y * side + x) * 4);
    }
  }

  const tile = cleanAlone(
    { width: side, height: side, data },
    { width: 16, height: 16 },
    { place: 'fill' },
  );
  assert.deepEqual(bbox(tile.opaque, tile.width), { left: 0, top: 0, right: 16, bottom: 16 });
  assert.equal(
    tile.opaque.reduce((sum, on) => sum + on, 0),
    256,
  );
});

// a failed read was taken as no presets, so saving one wrote over every preset saved before
test('a preset is not saved over a list that could not be read', async () => {
  const { readPresets, savePreset } = await import('../../src/store/presets.js');
  let doc = { list: [{ id: 'a' }, { id: 'b' }] };
  let failing = true;
  const backend = {
    async read() {
      if (failing) {
        throw new Error('timed out');
      }

      return doc;
    },
    async write(key, value) {
      doc = value;
    },
  };

  await assert.rejects(savePreset(backend, { id: 'c' }));
  failing = false;
  assert.deepEqual(
    (await readPresets(backend)).map((preset) => preset.id),
    ['a', 'b'],
  );
  await savePreset(backend, { id: 'c' });
  assert.deepEqual(
    (await readPresets(backend)).map((preset) => preset.id),
    ['a', 'b', 'c'],
  );
});

// a project kept as a preset gave new projects none of its palettes, settings, speed or part colours
test('a preset carries what its project was set up with', async () => {
  const { presetFromProject } = await import('../../src/model/preset-from-project.js');
  const project = newProject({ kind: 'character' });
  project.palettes = [{ id: 'pal', name: 'Mine', colors: [1, 2, 3] }];
  project.exportSettings = { preset: 'fit' };
  project.preview = { background: true };
  project.referenceDirection = 'east';
  project.parts = [{ id: 'cape', name: 'Cape', colours: [4, 5] }];
  project.animations[0].fps = 12;
  const made = newProject({ preset: presetFromProject(project) });

  assert.deepEqual(made.palettes, project.palettes);
  assert.deepEqual(made.exportSettings, project.exportSettings);
  assert.deepEqual(made.preview, { background: false });
  assert.equal(made.referenceDirection, 'east');
  assert.deepEqual(made.parts[0].colours, [4, 5]);
  assert.equal(made.animations[0].fps, 12);
});

// duplicating an animation copied its art but not the pins on its frames
test('a duplicated animation keeps its pins', async () => {
  const { duplicateAnimation } = await import('../../src/model/animations.js');
  const project = newProject();
  const animation = project.animations[0];
  const frame = Object.values(animation.directions)[0].frames[0];
  frame.marks = [{ name: 'Head', x: 3, y: 4 }];
  const copy = duplicateAnimation(project, animation);
  const copied = Object.values(copy.directions)[0].frames[0];

  assert.deepEqual(copied.marks, frame.marks);
  assert.notEqual(copied.marks, frame.marks);
  assert.notEqual(copied.id, frame.id);
});

// a kind from a newer version was drawn as a character but given a single view
test('a project of a kind this version does not know opens as a character, with its views', () => {
  const project = newProject();
  project.kind = 'vehicle';
  project.directionSet = 'eight';
  normalizeProject(project);

  assert.equal(project.directionSet, 'eight');
});

// work begun while the projects list could not be read was never added to it
test('a project made while the list could not be read joins it once it can be', async () => {
  const { writeList } = await import('../../src/ui/project-list.js');
  let stored = { list: [{ id: 'old', name: 'Old' }], current: 'old' };
  const backend = {
    async read() {
      return stored;
    },
    async write(key, value) {
      stored = value;
    },
  };
  const index = { list: [{ id: 'new', name: 'New' }], current: 'new', unreadable: true };

  await writeList({ backend, index });
  assert.deepEqual(
    stored.list.map((entry) => entry.id),
    ['old', 'new'],
  );
  assert.equal(stored.current, 'new');
  assert.equal(index.unreadable, undefined);
});

// two animations could share a name, and their sheets then overwrote each other in a download
test('animation names stay apart, and so do the files of names that read the same', async () => {
  const { startAnimation } = await import('../../src/model/animations.js');
  const { buildSheet } = await import('../../src/export/sheet.js');
  const project = newProject();
  const [idle] = project.animations;
  const again = startAnimation(project, idle, { name: idle.name });
  const run = startAnimation(project, idle, { name: 'Run' });
  const shout = startAnimation(project, idle, { name: 'Run!' });
  const settings = {
    includeMirrored: false,
    frameWidth: 64,
    frameHeight: 64,
    anchorX: 32,
    anchorY: 63,
  };
  const files = [idle, again, run, shout].map(
    (animation) => buildSheet(project, animation, settings).name,
  );

  assert.equal(again.name, `${idle.name} 2`);
  assert.equal(new Set(files).size, 4);
  assert.deepEqual(files.slice(2), ['run', 'run-2']);
});

// on an empty new frame the swap sheet made a palette of no colours, and suggesting from it threw
test('suggesting a mapping onto a palette with no colours suggests nothing', async () => {
  const { suggestMapping } = await import('../../src/palette/palette.js');

  assert.deepEqual(suggestMapping([1, 2], []), {});
});

// changing the frame rate while playing restarted play beside the old loop, whose next frame came
// a moment before the new start and asked the canvas for frame -1
test('play restarted keeps one loop, and never steps back before its first frame', async () => {
  const { stopPlayback, togglePlayback } = await import('../../src/ui/grid/playback.js');
  const project = newProject();
  const state = {
    project,
    at: { animation: project.animations[0].id, direction: 'south', frame: 0 },
  };
  const frames = [];
  const app = { store: { state } };
  const queued = [];
  globalThis.requestAnimationFrame = (callback) => queued.push(callback);
  const options = { isShown: () => true, onFrame: () => frames.push(app.playback?.frame) };

  togglePlayback(app, options);
  const oldLoop = queued.shift();
  stopPlayback(app);
  togglePlayback(app, options);
  const shown = frames.length;
  oldLoop(app.playback.start - 5);
  assert.equal(frames.length, shown, 'the old loop has ended');
  queued.at(-1)(app.playback.start - 5);
  assert.ok(app.playback.frame >= 0);
  delete globalThis.requestAnimationFrame;
});
