import { toast } from '../dom.js';
import { addFolder, moveToFolder } from '../../store/folders.js';
import { saveProjectList } from '../../store/projects.js';

// a failed save leaves the change on screen: the list's next save writes it
export function changeList({ app, redraw }, change) {
  const made = change(app.index);

  redraw();
  saveProjectList(app.backend, app.index).catch((error) =>
    toast(`Your folders could not be saved just now: ${error.message}`),
  );

  return made;
}

export function moveProject(job, { id, name }, folder) {
  changeList(job, (index) => moveToFolder(index, id, folder?.id ?? null));
  toast(folder ? `Moved ${name} to ${folder.name}` : `Took ${name} out of its folder`);
}

export function moveToNewFolder(job, project) {
  const folder = changeList(job, (index) => {
    const made = addFolder(index);

    moveToFolder(index, project.id, made.id);

    return made;
  });

  job.renameFolder(folder.id);
}
