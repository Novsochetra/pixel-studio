import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newProject } from '../../src/model/new-project.js';
import { addFrame } from '../../src/model/frames.js';
import { getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { buildSheet } from '../../src/export/sheet.js';
import { artAnchor, fittedFrame } from '../../src/export/anchor.js';
import { asepriteJson, frameFiles, sheetCell } from '../../src/export/formats.js';
import { encodeGif } from '../../src/io/gif.js';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);

test('a sprite sheet puts the feet on the frame anchor, frames across, directions down', () => {
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  const art = animation.directions.south.frames[1].layers[0].sprite;
  setPixel(art, 80, 128, RED);
  setPixel(art, 80, 100, BLUE);
  const anchor = artAnchor(art);
  assert.deepEqual(anchor, { x: 80, y: 128 });
  const fit = fittedFrame(project, animation, anchor);
  const { sheet, rows, frames, manifest } = buildSheet(project, animation, {
    ...fit,
    artAnchor: anchor,
    includeMirrored: false,
  });
  assert.equal(frames, 2);
  assert.deepEqual(
    rows.map((row) => row.direction),
    ['south', 'east', 'north'],
  );
  assert.equal(getPixel(sheet, fit.frameWidth + fit.anchorX, fit.anchorY), RED);
  assert.equal(getPixel(sheet, fit.frameWidth + fit.anchorX, fit.anchorY - 28), BLUE);
  assert.deepEqual(manifest.rows, { south: 0, east: 1, north: 2, west: { mirrorOf: 'east' } });
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
  const json = asepriteJson(result, settings, animation, 'idle.png');
  assert.equal(Object.keys(json.frames).length, 6);
  assert.deepEqual(json.frames['idle east 1'].frame, { x: 20, y: 30, w: 20, h: 30 });
  assert.deepEqual(
    json.meta.frameTags.map((tag) => [tag.name, tag.from, tag.to]),
    [
      ['idle south', 0, 1],
      ['idle east', 2, 3],
      ['idle north', 4, 5],
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

test('a sheet warns of views and frames not drawn yet', () => {
  const project = newProject({ kind: 'character', directionSet: 'four', width: 16, height: 16 });
  const animation = project.animations[0];
  const settings = {
    frameWidth: 16,
    frameHeight: 16,
    anchorX: 8,
    anchorY: 15,
    artAnchor: { x: 8, y: 15 },
    includeMirrored: true,
  };
  addFrame(project, animation, 0);
  setPixel(animation.directions.south.frames[0].layers[0].sprite, 8, 8, pack(255, 0, 0));
  const { warnings } = buildSheet(project, animation, settings);

  assert.ok(warnings.includes('south: frame 2 is empty.'));
  assert.ok(warnings.includes('east is empty: it ships as a blank row.'));
  assert.ok(!warnings.some((warning) => warning.startsWith('west')), 'a flipped row says nothing');
});

// The game pack's note said "idle: south: frame 2 is empty", where the window said Front
test('the game pack’s note names the views as the studio does', async () => {
  const { gamePack } = await import('../../src/export/game-pack.js');
  const project = newProject({ kind: 'character', directionSet: 'four', width: 16, height: 16 });
  const settings = {
    frameWidth: 16,
    frameHeight: 16,
    anchorX: 8,
    anchorY: 15,
    includeMirrored: true,
  };
  const note = gamePack(project, settings, 16).texts.find(({ path }) => path.endsWith('.txt')).text;

  assert.match(note, /Front is empty/);
  assert.doesNotMatch(note, /\bsouth\b/);
});

// Play skipped a frame hidden from it, and the GIF and the sheet showed it, with no word of it
test('the sheet says which frames are hidden from play and still in the files', async () => {
  const { setFrameHidden } = await import('../../src/model/frame-play.js');
  const project = newProject();
  const animation = project.animations[0];
  const settings = {
    frameWidth: 20,
    frameHeight: 30,
    anchorX: 10,
    anchorY: 29,
    artAnchor: { x: 80, y: 128 },
    includeMirrored: false,
  };

  addFrame(project, animation, 0);
  addFrame(project, animation, 1);
  assert.equal(
    buildSheet(project, animation, settings).warnings.some((warning) => warning.includes('hidden')),
    false,
  );

  setFrameHidden(animation, 1, true);
  const { warnings, frames } = buildSheet(project, animation, settings);

  assert.equal(frames, 3, 'the hidden frame is in the sheet');
  assert.ok(warnings.includes('Frame 2 is hidden from play, and still in the files.'));
});
