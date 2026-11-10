import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { snapshotAnimations } from '../../src/editor/snapshots.js';
import { newProject } from '../../src/model/new-project.js';
import { addFrame } from '../../src/model/frames.js';
import { pack } from '../../src/model/sprite.js';
import { menuPlace } from '../../src/ui/menu.js';
import { markAt } from '../../src/views/markup.js';
import { lassoModeFor } from '../../src/ui/tools-select.js';
import { fittedView } from '../../src/ui/view-kept.js';
import { buildSheet } from '../../src/export/sheet.js';
import { frameFiles } from '../../src/export/formats.js';
import { downloadName } from '../../src/ui/file-name.js';

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
  assert.equal(view.mode, 'edit', 'and no Views board');
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

// one mark or note on the Views board could not be taken away: only all of them, or the last
test('a press on the Views board finds the mark or note under it, on that view', () => {
  const markup = {
    strokes: [
      {
        direction: 'south',
        points: [
          [10, 10],
          [14, 12],
        ],
      },
    ],
    notes: [
      { direction: 'south', x: 30, y: 30, text: 'arm' },
      { direction: 'east', x: 12, y: 11, text: 'leg' },
    ],
  };

  assert.deepEqual(markAt(markup, { direction: 'south', x: 13, y: 12 }), {
    kind: 'strokes',
    index: 0,
  });
  assert.deepEqual(markAt(markup, { direction: 'south', x: 31, y: 28 }), {
    kind: 'notes',
    index: 0,
  });
  assert.deepEqual(markAt(markup, { direction: 'east', x: 13, y: 12 }), {
    kind: 'notes',
    index: 1,
  });
  assert.equal(markAt(markup, { direction: 'south', x: 50, y: 50 }), null);
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
