import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { newProject } from '../../src/model/new-project.js';
import { pack, setPixel } from '../../src/model/sprite.js';
import { fillMissingSprites, install } from '../../src/ui/session.js';

// choosing the reference view was not undoable, so the undo after it undid the step before
test('choosing the reference view is its own undo step', async () => {
  const { makeReference } = await import('../../src/ui/grid/view-menu.js');
  const project = newProject();
  const history = new History(() => null);
  const app = {
    history,
    store: { state: { project }, touch() {} },
    saver: { markStructure() {} },
  };
  const before = project.referenceDirection;

  makeReference(app, 'east');
  assert.equal(project.referenceDirection, 'east');
  history.undo(project);
  assert.equal(project.referenceDirection, before);
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
test('⌘⌫ erases a selection and ⌘ Esc lets go of it, as ⌫ and Esc do', async () => {
  const { handleSelectionKey } = await import('../../src/ui/selection-keys.js');
  const { rectSelection } = await import('../../src/editor/selection.js');
  const { getPixel, CLEAR } = await import('../../src/model/sprite.js');
  const project = newProject({ width: 4, height: 4 });
  const at = { animation: project.animations[0].id, direction: 'south', frame: 0, layer: null };
  const sprite = project.animations[0].directions.south.frames[0].layers[0].sprite;
  const state = { project, at, selection: rectSelection(sprite, [0, 0], [1, 1]), tool: 'select' };
  const app = {
    store: { state, set: (patch) => Object.assign(state, patch), touch() {} },
    history: new History(() => null),
    saver: { markLayers() {} },
  };
  const event = { shiftKey: false, preventDefault() {} };

  setPixel(sprite, 1, 1, pack(255, 0, 0));

  assert.equal(handleSelectionKey(app, event, 'backspace', true), true);
  assert.equal(getPixel(sprite, 1, 1), CLEAR);
  assert.equal(handleSelectionKey(app, event, 'escape', true), true);
  assert.equal(state.selection, null);
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

// a project opened again gave a view its deleted frames back, as copies of its last frame
test('a frame deleted from one view stays deleted when the project opens again', async () => {
  const { addFrame, removeViewFrame } = await import('../../src/model/frames.js');
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  // drawn in, so the other view's frame is no empty end to drop with it
  setPixel(animation.directions.east.frames[1].layers[0].sprite, 1, 1, pack(255, 0, 0));
  removeViewFrame(animation, 'south', 1);
  fillMissingSprites(project);

  assert.equal(animation.directions.south.frames.length, 1);
  assert.equal(animation.directions.east.frames.length, 2);
});

// going to a view with fewer frames left the place on a frame that view does not have
test('going to a shorter view lands on a frame it has', async () => {
  const { goTo } = await import('../../src/ui/actions.js');
  const { addFrame, removeViewFrame } = await import('../../src/model/frames.js');
  const project = newProject();
  const animation = project.animations[0];

  addFrame(project, animation, 0);
  // drawn in, so the other view's frame is no empty end to drop with it
  setPixel(animation.directions.east.frames[1].layers[0].sprite, 1, 1, pack(255, 0, 0));
  removeViewFrame(animation, 'south', 1);

  const app = {
    store: {
      state: { project, at: { animation: animation.id, direction: 'east', frame: 1, layer: null } },
      set(change) {
        Object.assign(this.state, change);
      },
    },
  };

  goTo(app, { direction: 'south' });
  assert.equal(app.store.state.at.frame, 0);
});
