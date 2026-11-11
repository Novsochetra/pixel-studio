import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { referenceOf } from '../../src/model/reference.js';
import { addAnimation, removeDirection } from '../../src/model/structure.js';
import { pack, setPixel } from '../../src/model/sprite.js';
import { fittedFrame } from '../../src/export/anchor.js';
import { encodeGif } from '../../src/io/gif.js';
import { keysFor } from '../../src/store/keys.js';
import { normalizeProject } from '../../src/model/normalize.js';
import { projectStructure } from '../../src/store/load.js';
import { readIndex } from '../../src/store/projects.js';
import { History } from '../../src/editor/history.js';
import { snapshotAnimations } from '../../src/editor/snapshots.js';
import { firstProject } from '../../src/ui/boot-project.js';

const RED = pack(255, 0, 0);

function memory(docs = {}, failing = () => false) {
  return {
    docs,
    async read(key) {
      if (failing(key)) {
        throw new Error('offline');
      }

      return docs[key] ?? null;
    },
    async write(key, value) {
      docs[key] = value;
    },
  };
}

const stored = (project) => ({ json: JSON.stringify(projectStructure(project)) });

// one dropped read of the projects list was taken as no projects, and an empty list was saved over it
test('an index that fails once is read again; one that keeps failing is marked unreadable', async () => {
  let calls = 0;
  const flaky = memory(
    { projects: { list: [{ id: 'a', prefix: 'p-a-' }], current: 'a' } },
    () => calls++ === 0,
  );

  assert.equal((await readIndex(flaky)).list.length, 1);

  const down = await readIndex(memory({}, () => true));
  assert.equal(down.unreadable, true);
  assert.deepEqual(down.list, []);

  assert.equal((await readIndex(memory())).unreadable, undefined);
});

// when the open project could not be read, the page gave up instead of opening another listed one
test('boot tries every listed project before showing the start screen', async () => {
  const second = newProject({ name: 'Second' });
  const backend = memory(
    { [keysFor('p-b-').project]: stored(second) },
    (key) => key === keysFor('p-a-').project,
  );
  const index = {
    list: [
      { id: 'a', prefix: 'p-a-' },
      { id: 'b', prefix: 'p-b-' },
    ],
    current: 'a',
  };
  const opened = await firstProject(backend, index);

  assert.equal(opened.project.name, 'Second');
  assert.equal(opened.prefix, 'p-b-');

  const none = await firstProject(
    memory({}, (key) => key.startsWith('p-')),
    index,
  );

  assert.equal(none.project, null, 'nothing readable: the start screen shows');
  assert.equal(none.failed, true, 'and it says the saved work could not be read');
});

// work saved before there was a projects list was not opened, as the list named nothing
test('with nothing saved the start screen shows; work from before projects still opens', async () => {
  const fresh = await firstProject(memory(), { list: [], current: null });

  assert.equal(fresh.project, null);
  assert.equal(fresh.failed, false);

  const unreadable = await firstProject(memory(), { list: [], current: null, unreadable: true });

  assert.equal(unreadable.project, null);
  assert.equal(unreadable.failed, true);

  const legacy = newProject({ name: 'Before projects' });
  delete legacy.id;
  const old = await firstProject(memory({ [keysFor('').project]: stored(legacy) }), {
    list: [],
    current: null,
  });

  assert.equal(old.project.name, 'Before projects');
  assert.equal(old.project.id, 'first-project');
  assert.equal(old.prefix, '');
});

// removing the reference view forgot which view it was, so undoing it brought the view back but
// not as the reference
test('removing the reference view leaves another as the reference, and undoing brings it back', () => {
  const project = newProject({ directionSet: 'four' });
  const animation = project.animations[0];
  const chosen = project.referenceDirection;
  const history = new History(() => null);
  const before = snapshotAnimations(project.animations);

  removeDirection(animation, chosen);
  history.recordStructure('Remove view', before, project);
  assert.ok(project.animations[0].directions[referenceOf(project)]);
  assert.equal(project.referenceDirection, chosen);
  history.undo(project);
  assert.ok(project.animations[0].directions[chosen]);
  assert.equal(referenceOf(project), chosen);
});

// "Fit the art" sized the frame for the open animation, so a taller one did not fit the sheet
test('"Fit the art" holds the art of every animation, not only the open one', () => {
  const project = newProject({ width: 32, height: 32 });
  const tall = addAnimation(project, 'Jump', Object.keys(project.animations[0].directions));
  const anchor = { x: 16, y: 25 };
  const direction = Object.keys(tall.directions)[0];

  setPixel(tall.directions[direction].frames[0].layers[0].sprite, 16, 2, RED);
  setPixel(project.animations[0].directions[direction].frames[0].layers[0].sprite, 16, 20, RED);
  const one = fittedFrame(project, project.animations[0], anchor);
  const all = fittedFrame(project, project.animations, anchor);

  assert.ok(all.frameHeight > one.frameHeight);
  assert.equal(all.anchorY, anchor.y - 2 + 1);
});

// a big GIF threw "Maximum call stack size exceeded" while encoding
test('a big GIF frame encodes without overflowing the stack', () => {
  const size = 512;
  const frame = { width: size, height: size, pixels: new Uint8ClampedArray(size * size * 4) };

  for (let i = 0; i < size * size; i++) {
    frame.pixels.set([(i * 7) % 256, (i * 13) % 256, (i * 3) % 256, 255], i * 4);
  }

  const gif = encodeGif([frame, frame], 100);

  assert.equal(String.fromCharCode(...gif.slice(0, 6)), 'GIF89a');
  assert.equal(gif[gif.length - 1], 0x3b);
});

// a save that failed was forgotten: nothing said so, and its changes were never written
test('a failed save is flagged and its changes stay waiting until a later save succeeds', async () => {
  const { Saver } = await import('../../src/store/saver.js');
  const docs = {};
  let offline = true;
  const backend = {
    async write(key, value) {
      if (offline) {
        throw new Error('offline');
      }

      docs[key] = value;
    },
    async remove() {},
  };
  const project = newProject({ width: 8, height: 8 });
  const saver = new Saver(backend, () => {}, keysFor('p-x-'));

  saver.attach(project);
  saver.remember(project);
  saver.markStructure();
  await saver.flushNow();

  assert.equal(saver.failed, true);
  offline = false;
  await saver.flushNow();
  assert.equal(saver.failed, false);
  assert.ok(docs[keysFor('p-x-').project]);
  saver.detach();
});

// projects from before kinds and presets lost their game, views and kit colours when opened
test('a project saved by an earlier version opens as a Naga Eleven character with its kit parts', () => {
  const old = newProject();

  delete old.kind;
  delete old.game;
  delete old.directionSet;
  delete old.parts;
  old.kitParts = { shirt: [1, 2], shorts: [3], socks: [], trim: [4] };
  const project = normalizeProject(old);

  assert.equal(project.kind, 'character');
  assert.equal(project.game.name, 'Naga Eleven');
  assert.equal(project.game.teamKits, true);
  assert.equal(project.directionSet, 'naga');
  assert.deepEqual(
    project.parts.map((part) => [part.id, part.colours]),
    [
      ['shirt', [1, 2]],
      ['shorts', [3]],
      ['socks', []],
      ['trim', [4]],
    ],
  );
  assert.equal(project.kitParts, undefined);
});
