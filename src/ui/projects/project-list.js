import { node } from '../dom.js';
import { placeHead } from './place-head.js';
import { projectRow } from './project-row.js';
import { EVERY_PROJECT, projectsIn } from '../../store/browse.js';

const UNREADABLE =
  'Your projects list could not be read just now, so only this one shows. Nothing was removed: reload the page to see the others.';
const ALONE =
  'Your other projects show here, each with its own views, animations, colours and history. For the next one of its kind, "… like this" under This project sets one up as this one is, with nothing drawn.';
const EMPTY_FOLDER =
  'Nothing in this folder yet. Pick "Move to folder…" in a project’s ⋯ menu, or drag a project onto the folder.';

function emptyHint({ app, view }, entries) {
  if (app.index.unreadable) {
    return node('p.hint', {}, UNREADABLE);
  }

  if (view.query.trim()) {
    return entries.length ? null : node('p.hint', {}, 'No project matches. Try fewer letters.');
  }

  if (view.place === EVERY_PROJECT) {
    return entries.length > 1 ? null : node('p.hint', {}, ALONE);
  }

  return entries.length ? null : node('p.hint', {}, EMPTY_FOLDER);
}

// inside one folder, its name on every row would only repeat the heading
function folderNameOf({ app, view }) {
  const names = new Map(app.index.folders.map((folder) => [folder.id, folder.name]));
  const mixed = view.place === EVERY_PROJECT || Boolean(view.query.trim());

  return (entry) => (mixed ? names.get(entry.folder) : null);
}

export function projectList(job) {
  const entries = projectsIn(job.app.index, job.view);
  const folderName = folderNameOf(job);

  return node(
    'section.projects-main',
    { 'aria-label': 'Projects here' },
    placeHead(job, entries),
    entries.length
      ? node(
          'div.project-list',
          { role: 'list' },
          entries.map((entry) => projectRow(job, { entry, folderName: folderName(entry) })),
        )
      : null,
    emptyHint(job, entries),
  );
}
