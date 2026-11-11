import { node, replace, toast } from '../dom.js';
import { addProject } from '../session.js';
import { saveProjectList } from '../../store/projects.js';
import { folderOf, moveToFolder } from '../../store/folders.js';
import { readStored, renameStored } from '../../store/stored-project.js';
import { readProjectFile, projectFileText } from '../../store/project-file.js';
import { inWords } from '../../model/told.js';

async function renameTo(job, project, name) {
  const { backend, index } = job.app;
  const renamed =
    name && name !== project.name && (await renameStored(backend, project.entry, name));

  if (renamed) {
    await saveProjectList(backend, index);
  } else if (renamed === false) {
    toast(`${project.name} could not be renamed. Try again in a moment.`);
  }

  job.redraw();
}

// A project that is not the open one is named on its own card, which asks for the name where it
// stood: it had to be opened first, only to be called something else.
export function renameOnCard(job, project, card) {
  const field = node('input.input', { value: project.name, 'aria-label': 'Project name' });
  const save = () => renameTo(job, project, field.value.trim()).catch(job.redraw);

  card.draggable = false;
  replace(
    card,
    node('label.card-ask', {}, 'Name', field),
    node(
      'div.card-answers',
      {},
      node('button.btn.primary', { onclick: save }, 'Rename'),
      node('button.btn', { onclick: job.redraw }, 'Cancel'),
    ),
  );
  card.onkeydown = (event) => {
    // Enter and Esc answer the card: Esc does not go on to close Projects
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.stopPropagation();
      event.key === 'Enter' ? save() : job.redraw();
    }
  };
  field.select();
}

// a copy of a project that is not the open one, made from its saved work and opened, as the
// open project's Duplicate does
export async function duplicateStored(job, project) {
  try {
    const stored = await readStored(job.app.backend, project.entry);
    const copy = {
      ...(await readProjectFile(projectFileText(stored.project))),
      name: `${project.name} copy`,
    };

    const { app } = job;
    const folder = folderOf(app.index, project.id);

    await addProject(app, copy, stored.background);
    // beside the one it was made from: a new project joins the open one's folder otherwise
    moveToFolder(app.index, app.store.state.project.id, folder);
    await saveProjectList(app.backend, app.index);
    toast(`Made "${copy.name}" and opened it`);
    job.redraw();
  } catch (error) {
    toast(inWords(error, `${project.name} could not be copied. Try again in a moment.`));
  }
}
