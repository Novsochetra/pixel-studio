import { node, toast } from '../dom.js';
import { folderOf, moveToFolder } from '../../store/folders.js';
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

export function folderPicker(job, entry) {
  const folders = job.app.index.folders ?? [];

  if (!folders.length) {
    return null;
  }

  const picker = node(
    'select.input.folder-picker',
    {
      'aria-label': `Folder of ${entry.name}`,
      onchange: (event) =>
        changeList(job, (index) => moveToFolder(index, entry.id, event.target.value)),
    },
    node('option', { value: '' }, 'No folder'),
    folders.map((folder) => node('option', { value: folder.id }, folder.name)),
  );

  picker.value = folderOf(job.app.index, entry.id) ?? '';

  return picker;
}
