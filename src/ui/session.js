import { startingState } from './starting-state.js';
import { settleAt } from './actions.js';
import { History } from '../editor/history.js';
import { Saver } from '../store/saver.js';
import { loadProject } from '../store/load.js';
import { keysFor, prefixFor } from '../store/keys.js';
import { deleteProjectData, saveProjectList, upsertEntry } from '../store/projects.js';
import { allLayers, newId } from '../model/project.js';
import { normalizeProject } from '../model/normalize.js';
import { createSprite } from '../model/sprite.js';
import { evenFrames } from '../model/frames.js';

// frames added to even out an older project's views, still to be written
const evened = new WeakMap();

export function fillMissingSprites(project) {
  normalizeProject(project);

  for (const { layer } of allLayers(project)) {
    layer.sprite ??= createSprite(project.canvas.width, project.canvas.height);
  }

  const added = evenFrames(project);

  if (added.length) {
    evened.set(project, added);
  }

  return project;
}

// Saves the open project before another takes its place; refuses while saving fails, so
// nothing unsaved is dropped.
async function saveBeforeLeaving(app) {
  await app.saver.flushNow();

  if (app.saver.failed) {
    throw new Error(
      `Your latest changes to ${app.store.state.project.name} could not be saved yet, so it stays open. Try again in a moment.`,
    );
  }
}

// the projects list follows each save: names, kinds, which one is open
function saveIndex(app, project) {
  const changed = upsertEntry(app.index, project, app.keys.prefix);

  if (changed || app.index.current !== project.id || app.index.unreadable || app.index.unwritten) {
    app.index.current = project.id;
    app.index.unwritten = false;

    return saveProjectList(app.backend, app.index);
  }

  return null;
}

// A saver for `project`. save: 'nothing' (just loaded), 'on-change' (an example, written once
// edited) or 'all' (new). stored: the layers already written, when a version replaces the project.
function startSaving(app, project, save, stored) {
  app.saver?.detach();
  app.saver = new Saver(
    app.backend,
    (status) => app.store.set({ saveStatus: status }),
    app.keys,
    (saved) => saveIndex(app, saved),
  );
  app.saver.attach(project);
  stored?.forEach((id) => app.saver.stored.add(id));

  if (save === 'all') {
    app.saver.markEverything(project);

    return;
  }

  app.saver.remember(project);

  if (save === 'on-change') {
    app.saver.saveAllOnFirstChange();
  }

  // frames given to views that had fewer: otherwise the saved project would name layers that
  // were never written, and they would come back empty
  if (evened.has(project) && save === 'nothing') {
    app.saver.markLayers(evened.get(project));
    app.saver.markStructure();
  }
}

// how the editor was showing things, kept when a version of the same project takes its place
const VIEW = [
  'mode',
  'zoom',
  'tool',
  'color',
  'brush',
  'showGrid',
  'showGuides',
  'viewFilter',
  'onion',
  'gridAll',
  'symmetry',
  'showPins',
  'pinName',
];

function viewKept(state, project) {
  const kept = Object.fromEntries(VIEW.map((key) => [key, state[key]]));

  return { ...kept, at: settleAt({ project, at: state.at }) };
}

// The open project is always in the list, even before its first save writes the list; marked so
// that save writes it, as nothing about the entry looks changed by then.
function listOpenProject(index, project, prefix) {
  const listed = upsertEntry(index, project, prefix);
  index.unwritten ||= listed || index.current !== project.id;
  index.current = project.id;
}

// Makes `project` the open one: its own undo history and its own saver. { prefix, save, keepView }:
// save as startSaving takes it; keepView keeps the zoom, tools and place being edited.
export function install(app, project, { prefix, save = 'nothing', keepView = false }) {
  // the same project rewritten (a version restored): the old saver knows which layers are stored,
  // so the ones the restored project lacks get removed
  const stored = app.keys?.prefix === prefix ? app.saver?.stored : null;
  const view = keepView ? viewKept(app.store.state, project) : {};
  app.backgroundImage = null;
  app.keys = keysFor(prefix);
  app.history = new History(app.findLayer);
  startSaving(app, project, save, stored);
  listOpenProject(app.index, project, prefix);
  const saveStatus = save === 'all' || evened.has(project) ? 'pending' : 'saved';
  app.store.set({ ...startingState(project), ...view, saveStatus });
}

export async function openProject(app, entry) {
  await saveBeforeLeaving(app);
  const project = await loadProject(app.backend, keysFor(entry.prefix));

  if (!project) {
    throw new Error(`"${entry.name}" could not be read from your saved work.`);
  }

  project.id ??= entry.id;

  install(app, fillMissingSprites(project), { prefix: entry.prefix });
  await saveProjectList(app.backend, app.index);
}

// a project made here, or read from a file, joins the list under a fresh id and is saved whole
// the new project is written before the list names it, so the list never points at nothing
export async function addProject(app, project, background = null) {
  await saveBeforeLeaving(app);
  project.id = newId('p');
  fillMissingSprites(project);
  install(app, project, { prefix: prefixFor(project.id), save: 'all' });

  if (background) {
    await app.backend.write(app.keys.background, { url: background });
  } else if (project.preview?.background) {
    project.preview = { ...project.preview, background: false };
  }

  await app.saver.flushNow();
  await saveProjectList(app.backend, app.index);
}

export async function deleteProject(app, id) {
  const entry = app.index.list.find((listed) => listed.id === id);

  if (!entry || app.index.list.length < 2) {
    return;
  }

  if (app.index.current === id) {
    await openProject(
      app,
      app.index.list.find((listed) => listed.id !== id),
    );
  }

  await deleteProjectData(app.backend, entry.prefix);
  app.index.list = app.index.list.filter((listed) => listed.id !== id);
  await saveProjectList(app.backend, app.index);
}

// an earlier version of the open project takes its place, under the same id and documents
export async function restoreProject(app, project) {
  await saveBeforeLeaving(app);
  project.id = app.store.state.project.id;
  install(app, fillMissingSprites(project), {
    prefix: app.keys.prefix,
    save: 'all',
    keepView: true,
  });
}
