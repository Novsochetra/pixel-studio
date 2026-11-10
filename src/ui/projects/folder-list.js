import { icon, node } from '../dom.js';
import { folderDropTarget } from './drag-to-folder.js';
import { moveProject } from './change-list.js';
import { EVERY_PROJECT, NO_FOLDER, countsByPlace, foldersMatching } from '../../store/browse.js';

const ICONS = { [EVERY_PROJECT]: 'tile', [NO_FOLDER]: 'picture' };

function dropInto(job, place) {
  return (id) => {
    const { index, store } = job.app;
    const entry = index.list.find((listed) => listed.id === id);
    const folder = index.folders.find((each) => each.id === place) ?? null;
    const name = id === store.state.project.id ? store.state.project.name : entry?.name;

    if (entry && (entry.folder ?? null) !== (folder?.id ?? null)) {
      moveProject(job, { id, name }, folder);
    }
  };
}

function placeButton(job, { place, name, count }) {
  const here = !job.view.query && job.view.place === place;
  const button = node(
    'button.place',
    {
      'data-place': place,
      'aria-current': here ? 'true' : null,
      title: name,
      onclick: () => job.goTo(place),
      ondblclick: place in ICONS ? null : () => job.renameFolder(place),
    },
    icon(ICONS[place] ?? 'folder'),
    node('span.place-name', {}, name),
    node('span.place-count', { 'aria-label': `${count} projects` }, String(count)),
  );

  if (place !== EVERY_PROJECT) {
    folderDropTarget(button, dropInto(job, place));
  }

  return button;
}

function foldersHead(job) {
  return node(
    'div.folders-head',
    {},
    node('span', {}, 'Folders'),
    node(
      'button.btn.quiet.folders-new',
      { title: 'Make a folder for a game, a cast or a set of tiles', onclick: job.newFolder },
      icon('plus'),
      'New folder',
    ),
  );
}

const NONE_YET =
  'Folders keep a game’s projects together. Put a project in one from its ⋯ menu, or drag it onto the folder.';

export function folderList(job) {
  const { index } = job.app;
  const counts = countsByPlace(index);
  const folders = foldersMatching(index, job.view.query);
  const hasFolders = Boolean(index.folders?.length);
  const place = (id, name) => placeButton(job, { place: id, name, count: counts.get(id) });

  return node(
    'nav.folder-list',
    { 'aria-label': 'Folders' },
    place(EVERY_PROJECT, 'All projects'),
    hasFolders ? place(NO_FOLDER, 'Not in a folder') : null,
    foldersHead(job),
    folders.map((folder) => place(folder.id, folder.name)),
    hasFolders ? null : node('p.hint.folders-none', {}, NONE_YET),
    hasFolders && !folders.length ? node('p.hint', {}, 'No folder matches.') : null,
  );
}
