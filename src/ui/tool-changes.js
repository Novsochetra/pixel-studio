import { toast } from './dom.js';
import { fillMissingSprites, install } from './session.js';
import { loadProject } from '../store/load.js';
import { followServerChanges, oneAtATime, touchesProject } from '../store/server-changes.js';

export const TOOL_STEP = 'Change from an AI tool';

const DRAG_WAIT_MS = 250;
const TOLD_EVERY_MS = 20000;

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

// Swapped from under a stroke, the tool drawing would paint on a project no longer shown.
async function afterDrag(app) {
  while (app.dragging) {
    await pause(DRAG_WAIT_MS);
  }
}

// The saver is started again on the tool's project with nothing to write: a save of the page's
// own copy, waiting or under way, would have written over what the tool drew. What that save
// held is still the step's `before`, so Undo brings it back.
async function takeProject(app) {
  await afterDrag(app);
  await app.saver.running;

  const { prefix } = app.keys;
  const project = await loadProject(app.backend, app.keys);

  if (!project || app.keys.prefix !== prefix) {
    return false;
  }

  const before = app.store.state.project;

  project.id = before.id;
  install(app, fillMissingSprites(project), { prefix, keepView: true });
  app.history.recordProject(TOOL_STEP, { before, after: project });
  app.store.touch('project');

  return true;
}

// what was taken is said once in a while: a tool drawing a part at a time sends a change a second
function sayTaken(app, told) {
  if (Date.now() - told.at < TOLD_EVERY_MS) {
    return;
  }

  told.at = Date.now();
  toast(`${app.store.state.project.name} was changed by an AI tool. Undo takes it back.`);
}

export function followTools(app) {
  if (!app.backend.kind?.startsWith('server:')) {
    return () => {};
  }

  const told = { at: 0 };
  const take = oneAtATime(async () => {
    if (await takeProject(app).catch(() => false)) {
      sayTaken(app, told);
    }
  });

  return followServerChanges((change) => {
    if (change.by === 'tool' && touchesProject(change, app.keys.prefix)) {
      take();
    }
  });
}
