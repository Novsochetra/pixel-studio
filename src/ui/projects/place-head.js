import { icon, node } from '../dom.js';
import { renameInPlace } from '../rename-field.js';
import { changeList } from './change-list.js';
import { EVERY_PROJECT, NO_FOLDER } from '../../store/browse.js';
import { removeFolder, renameFolder } from '../../store/folders.js';
import { askDelete } from '../ask-delete.js';

const counted = (count) => `${count} project${count === 1 ? '' : 's'}`;

const PLACES = { [EVERY_PROJECT]: 'All projects', [NO_FOLDER]: 'Not in a folder' };

// the keys go to a control of the list as it is drawn now: the one that was used went with the
// old list, and the next Tab began the window again
const keysTo = (selector) => document.querySelector(`.sheet ${selector}`)?.focus();

// A folder just made is named at once. Escape there takes the folder back: it left one called
// "New folder" that nobody had asked to keep.
function named(job, folder, { name, how }) {
  const unwanted = how === 'escape' && job.fresh === folder.id;

  job.fresh = null;

  if (unwanted) {
    changeList(job, (index) => removeFolder(index, folder.id));
  } else if (name) {
    changeList(job, (index) => renameFolder(index, folder.id, name));
  }

  if (how !== 'blur') {
    keysTo(unwanted ? '.folders-new' : '.place-rename');
  }
}

function renameButton(job, folder) {
  const rename = (event) => {
    const shown = event.currentTarget.closest('.place-head').querySelector('.place-title');

    renameInPlace(shown, {
      value: folder.name,
      label: 'Folder name',
      className: 'folder-name-field',
      onDone: (name, how) => named(job, folder, { name, how }),
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
      onDelete: () => {
        changeList(job, (index) => removeFolder(index, folder.id));
        keysTo('.place[aria-current="true"]');
      },
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

// "All projects" is the page's own name and the place picked just above: said a third time over
// the list it only took room, so there the heading is the count alone.
function heading(job, folder) {
  const searching = Boolean(job.view.query.trim());

  if (!searching && job.view.place === EVERY_PROJECT) {
    return null;
  }

  return [
    searching ? icon('search') : icon(folder ? 'folder' : 'tile'),
    node('h4.place-title', {}, title(job, folder)),
  ];
}

export function placeHead(job, entries) {
  const folder = job.app.index.folders.find((each) => each.id === job.view.place);
  const searching = Boolean(job.view.query.trim());
  const ownFolder = folder && !searching;

  return node(
    'div.place-head',
    {},
    heading(job, folder),
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
        'Line-up',
      ),
      ownFolder ? [renameButton(job, folder), deleteButton(job, folder, entries.length)] : null,
      searching ? node('button.btn.quiet', { onclick: job.clearSearch }, 'Clear search') : null,
    ),
  );
}
