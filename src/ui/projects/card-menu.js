import { openMenu } from '../menu.js';
import { toast } from '../dom.js';
import { moveProject, moveToNewFolder } from './change-list.js';
import { folderOf } from '../../store/folders.js';
import { foldersByName } from '../../store/browse.js';

function moveMenu(job, project, anchor) {
  const index = job.app.index;
  const at = folderOf(index, project.id);
  const folderItem = (folder) => [
    folder.id === at ? `✓ ${folder.name}` : folder.name,
    () => moveProject(job, project, folder),
    { disabled: folder.id === at },
  ];

  openMenu(anchor, [
    ['No folder', () => moveProject(job, project, null), { disabled: !at }],
    ...foldersByName(index).map(folderItem),
    null,
    ['New folder…', () => moveToNewFolder(job, project)],
  ]);
}

export function cardMenu(job, project, { anchor, onOpen, onDelete }) {
  const move = ['Move to folder…', () => moveMenu(job, project, anchor)];

  if (project.isOpen) {
    openMenu(anchor, [move], { onError: (error) => toast(error.message) });

    return;
  }

  openMenu(anchor, [['Open', onOpen], move, null, ['Delete…', onDelete, { danger: true }]], {
    onError: (error) => toast(error.message),
  });
}
