import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { History } from '../../src/editor/history.js';
import { freeName } from '../../src/model/free-name.js';
import { newProject } from '../../src/model/new-project.js';
import { takeOff } from '../../src/ui/put-back.js';

// a project file opened twice, or a copy made twice, gave two rows of one name in Projects
test('a name already in the list is numbered, and a free one is kept', () => {
  assert.equal(freeName('Hero', []), 'Hero');
  assert.equal(freeName('Hero', ['Hero']), 'Hero 2');
  assert.equal(freeName('Hero', ['Hero', 'Hero 2', 'Villain']), 'Hero 3');
});

function appOf(project) {
  const touched = [];

  return {
    touched,
    store: { state: { project }, touch: (what) => touched.push(what) },
    saver: { markStructure() {} },
    history: new History(() => null),
  };
}

// Removing a part or an outfit asked first, as undo could not bring it back, while removing a
// palette in the window beside it did not ask. All three are steps now.
test('a part taken off the project is a step that undo brings back in its place', () => {
  const project = newProject({ kind: 'character' });

  project.parts = [
    { id: 'a', name: 'Shirt', colours: [] },
    { id: 'b', name: 'Cape', colours: [] },
    { id: 'c', name: 'Boots', colours: [] },
  ];
  const app = appOf(project);
  const taken = {};

  takeOff(app, { key: 'parts', item: project.parts[1], taken });

  assert.deepEqual(
    project.parts.map((part) => part.name),
    ['Shirt', 'Boots'],
  );
  assert.equal(taken.parts.index, 1, 'the window remembers where it stood, to offer it back');
  assert.equal(app.history.canUndo, true);

  app.history.undo(project);

  assert.deepEqual(
    project.parts.map((part) => part.name),
    ['Shirt', 'Cape', 'Boots'],
  );
});
