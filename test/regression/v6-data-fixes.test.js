import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { normalizeProject } from '../../src/model/normalize.js';
import { isSingleView, kindOf } from '../../src/model/kinds.js';

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
  project.referenceDirection = 'east';
  project.parts = [{ id: 'cape', name: 'Cape', colours: [4, 5] }];
  project.animations[0].fps = 12;
  const made = newProject({ preset: presetFromProject(project) });

  assert.deepEqual(made.palettes, project.palettes);
  assert.deepEqual(made.exportSettings, project.exportSettings);
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
  assert.equal(kindOf(project).label, 'Character');
  assert.equal(isSingleView(project), false);
});

// work begun while the projects list could not be read was never added to it
test('a project made while the list could not be read joins it once it can be', async () => {
  const { saveProjectList } = await import('../../src/store/projects.js');
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

  await saveProjectList(backend, index);
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

// on a small canvas a later frame kept its own, bigger pixel size and lost its head off the top
test('a frame too big to keep its own size on the canvas is matched to the reference, not cut', async () => {
  const { readFileSync } = await import('node:fs');
  const { analyzeReference, cleanAlone, cleanLike } = await import('../../src/clean/like.js');
  const { bbox } = await import('../../src/clean/layout.js');
  const fixtures = new URL('../../fixtures/', import.meta.url);
  const load = (name) => ({
    ...JSON.parse(readFileSync(new URL(`${name}.json`, fixtures))),
    data: new Uint8Array(readFileSync(new URL(`${name}.rgba`, fixtures))),
  });
  const canvas = { width: 64, height: 64 };
  const standing = cleanAlone(load('front.png'), canvas, { place: 'feet', ground: 0.8 });
  const rgba = new Uint8Array(64 * 64 * 4);
  standing.opaque.forEach((on, i) => {
    if (on) {
      rgba.set([...standing.colors.subarray(i * 3, i * 3 + 3), 255], i * 4);
    }
  });
  const ref = analyzeReference({ ...canvas, data: rgba });
  const frame = cleanLike(load('side.webp'), ref, { keepScale: true });
  const box = bbox(frame.opaque, frame.width);

  assert.equal(frame.report.tooBig, true);
  assert.ok(box.top > 0, 'the head stays on the canvas');
  assert.equal(box.bottom, bbox(ref.opaque, ref.width).bottom, 'and the feet on the same row');
});
