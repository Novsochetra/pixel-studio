import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { newProject } from '../../src/model/new-project.js';
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
