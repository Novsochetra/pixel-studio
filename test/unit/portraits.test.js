import { strict as assert } from 'node:assert';
import { test } from 'node:test';

// A stand-in for the browser's canvas and images: a picture's "PNG" names its size, and an
// image read back from one is that size, every pixel opaque.
globalThis.document = {
  createElement: () => ({
    getContext() {
      return {
        putImageData() {},
        drawImage() {},
        getImageData: (left, top, width, height) => ({
          data: new Uint8ClampedArray(width * height * 4).fill(255),
        }),
      };
    },
    toDataURL() {
      return `data:image/png;base64,${this.width}x${this.height}`;
    },
  }),
};
globalThis.ImageData = Object;
globalThis.Image = class {
  async decode() {
    [this.naturalWidth, this.naturalHeight] = this.src.split(',')[1].split('x').map(Number);
  }
};

const { readPortrait, savePortrait } = await import('../../src/store/portraits.js');
const { deleteProjectData } = await import('../../src/store/projects.js');
const { projectStructure } = await import('../../src/store/load.js');
const { keysFor, prefixFor } = await import('../../src/store/keys.js');
const { newProject } = await import('../../src/model/new-project.js');
const { pack, setPixel } = await import('../../src/model/sprite.js');

function memory() {
  const docs = new Map();
  const writes = [];

  return {
    docs,
    writes,
    read: async (key) => docs.get(key) ?? null,
    write: async (key, value) => {
      writes.push(key);
      docs.set(key, value);
    },
    remove: async (key) => docs.delete(key),
  };
}

const firstLayer = (project) => project.animations[0].directions.south.frames[0].layers[0];

test("a project's picture is written after a save only when its art changed it", async () => {
  const backend = memory();
  const keys = keysFor(prefixFor('hero'));
  const project = newProject({ name: 'Hero', width: 32, height: 32 });

  let stored = await savePortrait(backend, keys, project, undefined);
  assert.equal(stored, null, 'nothing drawn: no picture, but that is written');
  assert.deepEqual(backend.docs.get(keys.portrait), { png: null });

  setPixel(firstLayer(project).sprite, 4, 4, pack(255, 0, 0));
  stored = await savePortrait(backend, keys, project, stored);
  assert.equal(stored, 'data:image/png;base64,1x1');
  stored = await savePortrait(backend, keys, project, stored);
  assert.equal(backend.writes.length, 2, 'the same picture again is not written');
});

test('a project saved before pictures were kept gets one from its own saved art', async () => {
  const backend = memory();
  const prefix = prefixFor('old');
  const keys = keysFor(prefix);
  const project = newProject({ name: 'Old hero', width: 32, height: 32 });

  backend.docs.set(keys.project, { json: JSON.stringify(projectStructure(project)) });
  backend.docs.set(keys.layer(firstLayer(project).id), { png: 'data:image/png;base64,32x32' });

  assert.equal(await readPortrait(backend, prefix), 'data:image/png;base64,32x32');
  assert.deepEqual(backend.docs.get(keys.portrait), { png: 'data:image/png;base64,32x32' });
  assert.equal(await readPortrait(backend, prefixFor('gone')), null, 'nothing saved: no picture');
});

test("a picture that cannot be read is left out, and goes with its project's documents", async () => {
  const backend = memory();
  const prefix = prefixFor('hero');

  backend.docs.set(keysFor(prefix).portrait, { png: 'data:image/png;base64,2x2' });
  assert.equal(
    await readPortrait({ read: () => Promise.reject(new Error('offline')) }, prefix),
    null,
  );
  await deleteProjectData(backend, prefix);
  assert.equal(backend.docs.has(keysFor(prefix).portrait), false);
});
