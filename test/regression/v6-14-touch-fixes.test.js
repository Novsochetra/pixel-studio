import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { snapshotAnimations } from '../../src/editor/snapshots.js';
import { newProject } from '../../src/model/new-project.js';
import { addFrame } from '../../src/model/frames.js';
import { createSprite, getPixel, pack, setPixel } from '../../src/model/sprite.js';
import { shrunk } from '../../src/model/shrink.js';
import { menuPlace } from '../../src/ui/menu.js';
import { moveAnimation, startAnimation } from '../../src/model/animations.js';
import { zipFiles } from '../../src/io/zip.js';
import { pieceOnCanvas } from '../../src/editor/floating.js';
import { lassoModeFor } from '../../src/ui/tools-select.js';
import { fittedView } from '../../src/ui/view-kept.js';
import { buildSheet } from '../../src/export/sheet.js';
import { frameFiles } from '../../src/export/formats.js';
import { downloadName } from '../../src/ui/file-name.js';
import { heldAt } from '../../src/ui/pinch.js';

const RED = pack(255, 0, 0);

// a page loaded again brought the work back on its first view and frame, with the pencil
test('the view a project was left on fits the project as it is now', () => {
  const project = newProject({ kind: 'icon', width: 8, height: 8 });
  const [animation] = project.animations;
  const [direction] = Object.keys(animation.directions);
  const view = fittedView(project, {
    tool: 'pose',
    mode: 'board',
    zoom: 9,
    color: RED,
    at: { animation: animation.id, direction, frame: 7, layer: null },
  });

  assert.equal(view.tool, 'pencil', 'an icon has no Pose tool');
  assert.equal('mode' in view, false, 'a workspace kept by an earlier version is let go');
  assert.equal(view.color, RED);
  assert.equal('zoom' in view, false, 'the canvas is fitted afresh');
  assert.equal(view.at.frame, 0, 'a frame it no longer has gives way to one it has');
});

// adding to a selection and taking away from it needed Shift and Alt, which fingers do not have
test('the Lasso adds or takes away by the keys held, or by what its bar is set to', () => {
  assert.equal(lassoModeFor({ shiftKey: true }, 'remove'), 'add');
  assert.equal(lassoModeFor({ altKey: true }, 'add'), 'remove');
  assert.equal(lassoModeFor({}, 'add'), 'add');
  assert.equal(lassoModeFor({}), 'new');
});

// undoing a deleted frame brought the frame back but left the editor on the one beside it
test('a structure step remembers where it was made from and where it led', () => {
  const project = newProject({ kind: 'icon', width: 8, height: 8 });
  const history = new History(() => null);
  const before = snapshotAnimations(project.animations);

  addFrame(project, project.animations[0], 0);
  history.recordStructure('New frame', before, project);
  history.keepPlace({ frame: 0 }, { frame: 1 });

  assert.deepEqual(history.undo(project).place, { before: { frame: 0 }, after: { frame: 1 } });
});

// a frame's menu was kept above its frame and its last items cut off, with room under the frame
test('a menu that fits on neither side of its button takes the room the window has', () => {
  const room = { top: 57, bottom: 656 };

  assert.deepEqual(menuPlace(200, { top: 100, bottom: 130 }, room), {
    top: 136,
    height: 200,
    opens: 'down',
  });
  assert.deepEqual(menuPlace(200, { top: 500, bottom: 560 }, room), {
    top: 294,
    height: 200,
    opens: 'up',
  });
  assert.deepEqual(menuPlace(390, { top: 380, bottom: 440 }, room), {
    top: 266,
    height: 390,
    opens: 'up',
  });
  assert.equal(menuPlace(900, { top: 380, bottom: 440 }, room).height, 599);
});

// an icon has one view, yet its files were named for a view: icon-front-32.png, idle/south/01.png
test('the files of art with one view name no view', () => {
  const icon = newProject({ kind: 'icon', name: 'Coin', width: 8, height: 8 });
  const settings = {
    frameWidth: 8,
    frameHeight: 8,
    anchorX: 4,
    anchorY: 7,
    includeMirrored: false,
  };
  const result = buildSheet(icon, icon.animations[0], settings);
  const character = newProject({ name: 'Hero' });

  assert.equal(downloadName(icon, 'south'), 'coin');
  assert.equal(downloadName(character, 'south'), 'hero-front');
  assert.deepEqual(
    frameFiles(result, settings).map((file) => file.path),
    [`${result.name}/01.png`],
  );
});

// pixels copied from a larger canvas were pasted where they came from: outside the smaller one
test('a piece copied from outside this canvas is pasted in its middle', () => {
  const far = [
    { x: 100, y: 60, color: RED },
    { x: 103, y: 61, color: RED },
  ];
  const near = [{ x: 3, y: 4, color: RED }];

  assert.deepEqual(
    pieceOnCanvas(far, { width: 32, height: 32 }).map(({ x, y }) => [x, y]),
    [
      [14, 15],
      [17, 16],
    ],
  );
  assert.equal(pieceOnCanvas(near, { width: 32, height: 32 }), near);
});

// every file in a zip was dated month 0, day 0 of 1980: no date at all
test('the files in a zip carry the day they were made', async () => {
  const zip = zipFiles(
    [{ name: 'a.txt', data: new Uint8Array([1]) }],
    new Date(2026, 10, 10, 9, 30),
  );
  const view = new DataView(await zip.arrayBuffer());
  const date = view.getUint16(12, true);

  assert.deepEqual([(date >> 9) + 1980, (date >> 5) & 15, date & 31], [2026, 11, 10]);
  assert.equal(view.getUint16(10, true) >> 11, 9);
});

// animations could not be put in another order: their tabs, and their sheets, stayed as made
test('an animation moves one place along, and stops at either end', () => {
  const project = newProject({ name: 'Hero' });
  const [idle] = project.animations;
  const walk = startAnimation(project, idle, { name: 'Walk' });
  const names = () => project.animations.map((animation) => animation.name);

  assert.equal(moveAnimation(project, walk, -1), true);
  assert.deepEqual(names(), ['Walk', idle.name]);
  assert.equal(moveAnimation(project, walk, -1), false);
  assert.deepEqual(names(), ['Walk', idle.name]);
});

// a frame's picture is drawn smaller than large art: a thin line fell between the pixels kept
test('art shrunk for a small picture keeps a line one pixel thin', () => {
  const sprite = createSprite(160, 160);

  for (let x = 0; x < 160; x++) {
    setPixel(sprite, x, 80, RED);
  }

  const small = shrunk(sprite, { left: 0, top: 0, right: 160, bottom: 160 }, 104 / 160);
  const drawn = Array.from({ length: small.width }, (_, x) =>
    Array.from({ length: small.height }, (_unused, y) => getPixel(small, x, y)).includes(RED),
  );

  assert.equal(small.width, 104);
  assert.equal(drawn.every(Boolean), true, 'the line crosses the whole picture');
});

// Two fingers moved the canvas by scrolling it and sized it in whole zooms, drawing it again at
// every move: it lagged and jumped. Held, it is placed so the pixel under the fingers stays there.
test('a canvas held by two fingers keeps the pixel under them, at any size between zooms', () => {
  const start = {
    box: { left: 100, top: 200 },
    zoom: 4,
    spread: 100,
    grip: { x: 40, y: 20 },
  };
  const fingers = new Map([
    [1, { x: 170, y: 260 }],
    [2, { x: 320, y: 260 }],
  ]);
  const held = heldAt(start, fingers);
  const underFingers = {
    x: start.box.left + held.x + start.grip.x * held.scale,
    y: start.box.top + held.y + start.grip.y * held.scale,
  };

  assert.equal(held.zoom, 6, 'half as wide again is half as big again, not the next whole zoom');
  assert.deepEqual(underFingers, { x: 245, y: 260 });
  assert.equal(heldAt({ ...start, spread: 1 }, fingers).zoom, 24, 'and no bigger than it can be');
});
