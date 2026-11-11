import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newProject } from '../../src/model/new-project.js';
import { withCanvasSize } from '../../src/model/canvas-size.js';
import { keysFor } from '../../src/store/keys.js';
import { projectStructure } from '../../src/store/load.js';
import { projectFileText, readProjectFile } from '../../src/store/project-file.js';
import { deleteProjectData } from '../../src/store/projects.js';
import { firstProject } from '../../src/ui/boot-project.js';
import { startingState } from '../../src/ui/starting-state.js';
import { fittedView } from '../../src/ui/view-kept.js';

const PICTURE = 'data:image/png;base64,AAAA';

// What a project kept from when the studio had a Views board and a scene to preview the art in:
// the board's marks and notes, the scene's settings, and the scene's picture beside it.
function savedEarlier() {
  const project = newProject({ name: 'Striker', width: 16, height: 16 });

  project.markup = {
    strokes: [
      {
        direction: 'south',
        points: [
          [1, 2],
          [3, 4],
        ],
      },
    ],
    notes: [{ direction: 'south', x: 5, y: 6, text: 'longer arm' }],
  };
  project.preview = { background: true, ground: 0.9 };

  return project;
}

function memory(docs) {
  return {
    docs,
    read: async (key) => docs[key] ?? null,
    write: async (key, value) => {
      docs[key] = value;
    },
    remove: async (key) => {
      delete docs[key];
    },
  };
}

function storedEarlier() {
  const keys = keysFor('p-a-');

  return memory({
    [keys.project]: { json: JSON.stringify(projectStructure(savedEarlier())) },
    [keys.background]: { url: PICTURE },
  });
}

test('work saved with marks, notes and a scene of its own still opens, in the editor', async () => {
  const index = { list: [{ id: 'a', prefix: 'p-a-' }], current: 'a' };
  const opened = await firstProject(storedEarlier(), index);
  const state = startingState(opened.project);

  assert.equal(opened.project.name, 'Striker');
  assert.equal(state.at.frame, 0);
  assert.equal('mode' in state, false, 'there is one workspace, so the state names none');
});

test('a project file saved with a scene picture and marks still opens', async () => {
  const project = savedEarlier();

  for (const animation of project.animations) {
    for (const entry of Object.values(animation.directions)) {
      entry.frames[0].layers[0].sprite = null;
    }
  }

  const file = { ...JSON.parse(projectFileText(project)), background: PICTURE };
  const read = await readProjectFile(JSON.stringify(file));

  assert.equal(read.name, 'Striker');
  assert.equal(read.animations.length, project.animations.length);
});

test('a view left on the board or in the scene comes back to the editor', () => {
  const project = savedEarlier();
  const [animation] = project.animations;
  const at = { animation: animation.id, direction: 'south', frame: 0, layer: null };

  for (const mode of ['board', 'game']) {
    const view = fittedView(project, { mode, tool: 'eraser', at });

    assert.equal('mode' in view, false);
    assert.equal(view.tool, 'eraser', 'with the tool that was in hand');
  }
});

test('a canvas of another size leaves what the studio no longer shows as it was', () => {
  const project = savedEarlier();
  const bigger = withCanvasSize(project, { width: 32, height: 24 }, { x: 0.5, y: 1 });

  assert.equal(bigger.canvas.width, 32);
  assert.deepEqual(bigger.markup, project.markup);
});

test('a project deleted takes the scene picture saved beside it', async () => {
  const backend = storedEarlier();

  await deleteProjectData(backend, 'p-a-');

  assert.deepEqual(Object.keys(backend.docs), []);
});
