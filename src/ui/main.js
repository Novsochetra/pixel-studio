import { createStore } from './store.js';
import { mountApp } from './app.js';
import { toast } from './dom.js';
import { startingState } from './starting-state.js';
import { addProject, fillMissingSprites, install } from './session.js';
import { firstProject } from './boot-project.js';
import { sampleProject } from './sample.js';
import { showStartScreen } from './start/start-screen.js';
import { showOpening } from './opening-screen.js';
import { openBackend } from '../store/backends.js';
import { readIndex } from '../store/projects.js';
import { deletePreset, readPresets } from '../store/presets.js';
import { prefixFor } from '../store/keys.js';
import { readProjectBundle } from '../store/project-file.js';
import { allLayers, newId } from '../model/project.js';

// the editor, opened on one project; `save` as install() takes it
async function startEditor(backend, index, { project, prefix, save, background = null }) {
  const store = createStore({ ...startingState(project), storage: backend.kind });
  const app = { store, backend, index };
  app.findLayer = (id) =>
    [...allLayers(store.state.project)].find(({ layer }) => layer.id === id)?.layer ?? null;
  install(app, project, { prefix, save });
  app.addProject = (next, nextBackground) => addProject(app, next, nextBackground);

  if (background) {
    await backend.write(app.keys.background, { url: background });
  } else if (project.preview?.background) {
    project.preview = { ...project.preview, background: false };
  }

  mountApp(app);

  // a project made or opened here is written at once, as adding one in the editor is
  if (save === 'all') {
    await app.saver.flushNow();
  }
}

// a project made or opened on the start screen: new documents of its own, saved whole
const fresh = (project) => {
  project.id = newId('p');

  return { project: fillMissingSprites(project), prefix: prefixFor(project.id), save: 'all' };
};

function startScreenHandlers(backend, index, closeScreen) {
  const open = (opened) => {
    closeScreen();

    return startEditor(backend, index, opened);
  };

  return {
    onCreate: (project) => open(fresh(project)),
    async onExample() {
      const sample = fillMissingSprites(await sampleProject());
      // the example is only written once it is edited
      open({ project: sample, prefix: prefixFor(sample.id), save: 'on-change' });
    },
    async onOpenFile(file) {
      try {
        const { project, background } = await readProjectBundle(await file.text());
        await open({ ...fresh(project), background });
      } catch (error) {
        toast(error.message);
      }
    },
    onDeletePreset: (preset) =>
      deletePreset(backend, preset.id).catch((error) => toast(error.message)),
  };
}

async function openWork() {
  const backend = await openBackend();
  const index = await readIndex(backend);
  const opened = await firstProject(backend, index);

  if (opened.project) {
    await startEditor(backend, index, opened);

    return;
  }

  const presets = await readPresets(backend);
  let screen = null;
  const handlers = startScreenHandlers(backend, index, () => screen.close());
  screen = showStartScreen({ presets, failed: opened.failed, handlers });
}

async function boot() {
  const opening = showOpening();

  try {
    await openWork();
    opening.close();
  } catch (error) {
    opening.fail(error);
  }
}

boot();
