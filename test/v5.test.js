import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newProject, normalizeProject } from '../src/model/project.js';
import { drawableDirections } from '../src/model/profiles.js';
import { addFrame } from '../src/model/frames.js';
import { pack, setPixel } from '../src/model/sprite.js';
import { buildSheet } from '../src/export/sheet.js';
import { asepriteJson, frameFiles, sheetCell } from '../src/export/formats.js';
import { encodeGif } from '../src/io/gif.js';
import { keysFor, prefixFor } from '../src/store/keys.js';
import { upsertEntry } from '../src/store/projects.js';

const RED = pack(255, 0, 0);

test('a side-scroller project draws one direction and mirrors the other', () => {
  const project = newProject({
    name: 'Slime',
    profile: 'generic',
    directionSet: 'side',
    width: 48,
    height: 32,
  });
  assert.deepEqual(Object.keys(project.animations[0].directions), ['east']);
  assert.equal(project.referenceDirection, 'east');
  assert.deepEqual(project.canvas, { width: 48, height: 32, scale: 5 });
  assert.equal(project.animations[0].directions.east.frames[0].layers[0].sprite.width, 48);
  const { rows, manifest } = buildSheet(project, project.animations[0], {
    frameWidth: 48,
    frameHeight: 32,
    anchorX: 24,
    anchorY: 25,
    artAnchor: { x: 24, y: 25 },
    includeMirrored: false,
  });
  assert.deepEqual(
    rows.map((row) => row.direction),
    ['east'],
  );
  assert.deepEqual(manifest.rows, { east: 0, west: { mirrorOf: 'east' } });
});

test('every direction set starts with directions it can draw', () => {
  for (const set of ['side', 'four', 'four-drawn', 'naga', 'eight']) {
    const project = newProject({ profile: 'generic', directionSet: set });
    const drawn = Object.keys(project.animations[0].directions);
    assert.ok(drawn.length >= 1);
    assert.ok(
      drawn.every((direction) => drawableDirections(project).includes(direction)),
      set,
    );
  }
});

test('a project saved by an earlier version opens as Naga Eleven with its kit parts', () => {
  const old = newProject();
  delete old.profile;
  delete old.directionSet;
  delete old.parts;
  old.kitParts = { shirt: [1, 2], shorts: [3], socks: [], trim: [4] };
  const project = normalizeProject(old);
  assert.equal(project.profile, 'naga-eleven');
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

test('the Aseprite JSON names every frame and tags each direction', () => {
  const project = newProject();
  const animation = project.animations[0];
  addFrame(project, animation, 0);
  setPixel(animation.directions.east.frames[0].layers[0].sprite, 80, 128, RED);
  const settings = {
    frameWidth: 20,
    frameHeight: 30,
    anchorX: 10,
    anchorY: 29,
    artAnchor: { x: 80, y: 128 },
    includeMirrored: false,
  };
  const result = buildSheet(project, animation, settings);
  const json = asepriteJson(result, settings, animation, 'pose.png');
  assert.equal(Object.keys(json.frames).length, 6);
  assert.deepEqual(json.frames['pose east 1'].frame, { x: 20, y: 30, w: 20, h: 30 });
  assert.deepEqual(
    json.meta.frameTags.map((tag) => [tag.name, tag.from, tag.to]),
    [
      ['pose south', 0, 1],
      ['pose east', 2, 3],
      ['pose north', 4, 5],
    ],
  );
  assert.deepEqual(json.meta.size, { w: 40, h: 90 });
  assert.equal(frameFiles(result, settings).length, 6);
  assert.equal(
    sheetCell(result, settings, 1, 0).pixels[(29 * 20 + 10) * 4],
    255,
    'the feet pixel sits on the anchor of its cell',
  );
});

test('projects keep their documents apart, and the list follows renames', () => {
  assert.equal(keysFor('').project, 'project');
  assert.equal(keysFor(prefixFor('abc')).layer('l1'), 'p-abc-layer-l1');
  const index = { list: [], current: null };
  const project = newProject({ name: 'Knight', profile: 'generic' });
  assert.equal(upsertEntry(index, project, 'p-x-'), true);
  assert.equal(upsertEntry(index, project, 'p-x-'), false);
  project.name = 'Dark knight';
  assert.equal(upsertEntry(index, project, 'p-x-'), true);
  assert.equal(index.list[0].name, 'Dark knight');
  assert.equal(index.list[0].prefix, 'p-x-');
});

test('GIFs decode in Pillow with the right frames, colours and transparency', () => {
  const frames = [0, 1, 2].map((frameIndex) => {
    const sprite = { width: 9, height: 7, pixels: new Uint8ClampedArray(9 * 7 * 4) };
    for (let i = 0; i < 9 * 7; i++) {
      if ((i + frameIndex) % 3) {
        sprite.pixels.set([(i * 40) % 256, (frameIndex * 90) % 256, 120, 255], i * 4);
      }
    }
    return sprite;
  });
  const dir = mkdtempSync(join(tmpdir(), 'gif-'));
  writeFileSync(join(dir, 'a.gif'), encodeGif(frames, 100));
  writeFileSync(
    join(dir, 'a.json'),
    JSON.stringify(frames.map((frame) => Array.from(frame.pixels))),
  );
  const out = execFileSync('python3', [
    '-c',
    `
import json, numpy as np
from PIL import Image, ImageSequence
im = Image.open('${dir}/a.gif'); want = json.load(open('${dir}/a.json'))
got = [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(im)]
ok = len(got) == 3
for k, w in enumerate(want):
    a = np.array(w, dtype=np.uint8).reshape(7, 9, 4); op = a[..., 3] > 0
    ok = ok and ((got[k][..., 3] > 0) == op).all() and (got[k][op][:, :3] == a[op][:, :3]).all()
print('ok' if ok else 'bad', im.info.get('loop'))`,
  ])
    .toString()
    .trim();
  assert.equal(out, 'ok 0');
});
