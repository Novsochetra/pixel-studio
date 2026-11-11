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
import { setUpApp } from './install-app.js';
import { layoutSize, watchLayout } from './layout.js';
import { watchPressesFromStart } from './after-press.js';
import { watchSegmented } from './segmented-thumb.js';
import { inWords } from '../model/told.js';
import { watchView } from './view-kept.js';
import { watchOtherTabs } from './other-tabs.js';

// the editor, opened on one project; `save` as install() takes it
async function startEditor(backend, index, { project, prefix, save, background = null }) {
  // the window's size and the panel open on a phone belong to the window, not to a project
  const store = createStore({
    ...startingState(project),
    storage: backend.kind,
    layout: layoutSize(),
    panel: null,
  });
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
  watchView(app);
  app.otherTabs = watchOtherTabs(app);

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
  // the keyboard starts on the tool in hand, not lost on the page behind the start screen
  const open = async (opened) => {
    closeScreen();
    await startEditor(backend, index, opened);

    if (document.activeElement === document.body) {
      document.querySelector('#rail [aria-pressed="true"]')?.focus();
    }
  };

  return {
    onCreate: (project) => open(fresh(project)),
    async onExample() {
      const sample = fillMissingSprites(await sampleProject());

      // Written as it opens, like a project made here: the bar said Saved and Projects listed
      // it, yet a page loaded again before the first change had nothing to show for it.
      open({ project: sample, prefix: prefixFor(sample.id), save: 'all' });
    },
    async onOpenFile(file) {
      try {
        const { project, background } = await readProjectBundle(await file.text());

        await open({ ...fresh(project), background });
      } catch (error) {
        toast(inWords(error, 'This file could not be opened as a project.'));
      }
    },
    onDeletePreset: (preset) =>
      deletePreset(backend, preset.id).catch(() =>
        toast('The preset could not be forgotten. Try again in a moment.'),
      ),
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

setUpApp();
watchLayout();
watchPressesFromStart();
watchSegmented();
// Safari on an iPhone shows a button's :active look, its give under the finger, only on a page
// that listens for touches
document.addEventListener('touchstart', () => {}, { passive: true });
// Safari's own pinch, which older iPhones zoom the page with whatever touch-action says: the
// page never zooms (10-base.css), and the canvas takes its pinch from the fingers themselves
document.addEventListener('gesturestart', (event) => event.preventDefault());
boot();
