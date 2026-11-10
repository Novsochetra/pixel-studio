import { icon, node } from '../dom.js';
import { renameInPlace } from '../rename-field.js';
import { changeList } from './change-list.js';
import { EVERY_PROJECT, NO_FOLDER } from '../../store/browse.js';
import { removeFolder, renameFolder } from '../../store/folders.js';
import { askDelete } from '../ask-delete.js';

const counted = (count) => `${count} project${count === 1 ? '' : 's'}`;

const PLACES = { [EVERY_PROJECT]: 'All projects', [NO_FOLDER]: 'Not in a folder' };

function renameButton(job, folder) {
  const rename = (event) => {
    const shown = event.currentTarget.closest('.place-head').querySelector('.place-title');

    renameInPlace(shown, {
      value: folder.name,
      label: 'Folder name',
      className: 'folder-name-field',
      onDone: (name) => name && changeList(job, (index) => renameFolder(index, folder.id, name)),
    });
  };

  return node('button.btn.quiet.place-rename', { onclick: rename }, 'Rename');
}

function deleteButton(job, folder, count) {
  const place = node('span.ask-place');
  const ask = () =>
    askDelete(place, {
      question: count
        ? `Delete the folder? Its ${counted(count)} ${count === 1 ? 'stays' : 'stay'}.`
        : 'Delete the folder?',
      onDelete: () => changeList(job, (index) => removeFolder(index, folder.id)),
    });

  place.append(node('button.btn.quiet', { onclick: ask }, 'Delete folder'));

  return place;
}

function title(job, folder) {
  const { place, query } = job.view;

  if (query.trim()) {
    return `Found for “${query.trim()}”`;
  }

  return folder?.name ?? PLACES[place];
}

export function placeHead(job, entries) {
  const folder = job.app.index.folders.find((each) => each.id === job.view.place);
  const searching = Boolean(job.view.query.trim());
  const ownFolder = folder && !searching;

  return node(
    'div.place-head',
    {},
    searching ? icon('search') : icon(folder ? 'folder' : 'tile'),
    node('h4.place-title', {}, title(job, folder)),
    node('span.view-meta', {}, counted(entries.length)),
    node(
      'div.group.place-actions',
      {},
      node(
        'button.btn.quiet',
        {
          title: 'These projects side by side at one pixel size, to check their sizes agree',
          disabled: !entries.length,
          onclick: () => job.lineUp(entries),
        },
        'Line up',
      ),
      ownFolder ? [renameButton(job, folder), deleteButton(job, folder, entries.length)] : null,
      searching ? node('button.btn.quiet', { onclick: job.clearSearch }, 'Clear search') : null,
    ),
  );
}
