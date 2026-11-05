import { createStore } from './store.js';
import { mountApp } from './app.js';
import { h, toast } from './dom.js';
import { startingState } from './starting-state.js';
import { addProject, install } from './session.js';
import { firstProject } from './boot-project.js';
import { openBackend } from '../store/backends.js';
import { readIndex } from '../store/projects.js';
import { allLayers } from '../model/project.js';

async function boot() {
  const stage = document.getElementById('stage');
  stage.append(h('div.stage-inner', {}, h('p.hint', {}, 'Opening your work…')));
  const backend = await openBackend();
  const index = await readIndex(backend);
  const { project, prefix, save, failed } = await firstProject(backend, index);
  const store = createStore({ ...startingState(project), storage: backend.kind });
  const app = { store, backend, index };
  app.findLayer = (id) => [...allLayers(store.state.project)].find(({ layer }) => layer.id === id)?.layer ?? null;
  install(app, project, prefix, save);
  app.addProject = (next, background) => addProject(app, next, background);
  mountApp(app);

  if (failed) {
    toast('Your saved work could not be read just now, so the sample opened on its own and nothing was written over. Reload the page to try again.');
  }
}

boot();
