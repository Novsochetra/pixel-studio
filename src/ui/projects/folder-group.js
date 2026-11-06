import { icon, node } from '../dom.js';
import { renameInPlace } from '../rename-field.js';
import { changeList } from './folder-picker.js';
import { listRow } from './list-row.js';
import { removeFolder, renameFolder } from '../../store/folders.js';

const EMPTY = 'Nothing here yet: pick this folder in a project’s row to put it here.';

const counted = (count) => `${count} project${count === 1 ? '' : 's'}`;

function renameButton(job, folder) {
  const rename = (event) => {
    const shown = event.currentTarget.closest('.folder-head').querySelector('.folder-name');

    renameInPlace(shown, {
      value: folder.name,
      label: 'Folder name',
      className: 'folder-name-field',
      onDone: (name) => name && changeList(job, (index) => renameFolder(index, folder.id, name)),
    });
  };

  return node('button.btn.quiet.folder-rename', { onclick: rename }, 'Rename');
}

function deleteButton(job, folder) {
  let confirming = false;
  const remove = (event) => {
    if (!confirming) {
      confirming = true;
      event.currentTarget.textContent = 'Delete the folder? Its projects stay. Click again';

      return;
    }

    changeList(job, (index) => removeFolder(index, folder.id));
  };

  return node('button.btn.quiet', { onclick: remove }, 'Delete folder');
}

function folderHead(job, { folder, entries }) {
  return node(
    'div.folder-head',
    {},
    folder ? icon('folder') : null,
    node('h4.folder-name', {}, folder?.name ?? 'Not in a folder'),
    node('span.view-meta', {}, counted(entries.length)),
    node(
      'div.group',
      { style: { gap: '4px' } },
      node(
        'button.btn.quiet',
        { disabled: !entries.length, onclick: () => job.lineUp(entries) },
        'Line up',
      ),
      folder ? [renameButton(job, folder), deleteButton(job, folder)] : null,
    ),
  );
}

export function folderGroup(job, group) {
  return node(
    'section.folder-group',
    {
      'data-folder': group.folder?.id ?? '',
      'aria-label': group.folder?.name ?? 'Not in a folder',
    },
    folderHead(job, group),
    group.entries.map((entry) => listRow(job, entry)),
    group.entries.length ? null : node('p.hint', {}, EMPTY),
  );
}
