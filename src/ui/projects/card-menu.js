import { openMenu } from '../menu.js';
import { toast } from '../dom.js';
import { moveProject, moveToNewFolder } from './change-list.js';
import { folderOf } from '../../store/folders.js';
import { foldersByName } from '../../store/browse.js';
import { inWords } from '../../model/told.js';

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

const onError = (error) =>
  toast(inWords(error, 'That could not be done just now. Try again in a moment.'));

export function cardMenu(job, project, { anchor, onOpen, onDelete }) {
  const move = ['Move to folder…', () => moveMenu(job, project, anchor)];

  // The project open now goes like any other, another taking its place in the editor; the last
  // one stays, as the editor is never without a project.
  if (project.isOpen) {
    const only = job.app.index.list.length < 2;
    const remove = only
      ? ['Delete… (the only project stays)', () => {}, { disabled: true }]
      : ['Delete…', onDelete, { danger: true }];

    openMenu(anchor, [move, null, remove], { onError });

    return;
  }

  openMenu(anchor, [['Open', onOpen], move, null, ['Delete…', onDelete, { danger: true }]], {
    onError,
  });
}
