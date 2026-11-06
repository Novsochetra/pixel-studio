import { node, toast } from '../dom.js';
import { addProject } from '../session.js';
import { newProjectChooser } from '../start/chooser.js';
import { sampleProject } from '../sample.js';
import { EVERY_PROJECT, NO_FOLDER } from '../../store/browse.js';
import { moveToFolder } from '../../store/folders.js';
import { saveProjectList } from '../../store/projects.js';
import { deletePreset, readPresets } from '../../store/presets.js';

// from every project, a new one stays where addProject put it: in the open project's folder, as
// the next character of a game goes
async function placeNew({ app, view }, project) {
  if (view.place === EVERY_PROJECT) {
    return;
  }

  moveToFolder(app.index, project.id, view.place === NO_FOLDER ? null : view.place);
  await saveProjectList(app.backend, app.index);
}

export function whereNewGoes({ app, view }) {
  const folder = app.index.folders.find((each) => each.id === view.place);

  return folder ? ` in ${folder.name}` : '';
}

export async function startSection(job) {
  const { app } = job;
  const opened = (project) =>
    addProject(app, project)
      .then(() => placeNew(job, project))
      .then(job.close, (error) => toast(error.message));
  const chooser = newProjectChooser({
    presets: await readPresets(app.backend),
    onCreate: opened,
    onDeletePreset: (preset) =>
      deletePreset(app.backend, preset.id).catch((error) =>
        toast(`The preset could not be forgotten: ${error.message}`),
      ),
  });

  return node(
    'details.start-section',
    { open: app.index.list.length < 2 },
    node('summary', {}, 'New project', node('span.start-where', {}, whereNewGoes(job))),
    chooser,
    node(
      'button.btn.quiet',
      { onclick: async () => opened(await sampleProject()) },
      'Try the example character',
    ),
  );
}
