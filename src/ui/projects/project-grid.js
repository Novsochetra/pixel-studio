import { node } from '../dom.js';
import { placeHead } from './place-head.js';
import { projectCard } from './project-card.js';
import { EVERY_PROJECT, projectsIn } from '../../store/browse.js';

const UNREADABLE =
  'Your projects list could not be read just now, so only this one shows. Nothing was removed: reload the page to see the others.';
const ALONE =
  'Your other projects show here, each with its own views, animations, colours and history. For the next character of your game, "New character like this" above sets one up as this one is, with nothing drawn.';
const EMPTY_FOLDER =
  'Nothing in this folder yet. Drag a project onto it on the left, or pick "Move to folder…" in a project’s ⋯ menu.';

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

// inside one folder, its name on every card would only repeat the heading
function folderNameOf({ app, view }) {
  const names = new Map(app.index.folders.map((folder) => [folder.id, folder.name]));
  const mixed = view.place === EVERY_PROJECT || Boolean(view.query.trim());

  return (entry) => (mixed ? names.get(entry.folder) : null);
}

export function projectGrid(job) {
  const entries = projectsIn(job.app.index, job.view);
  const folderName = folderNameOf(job);

  return node(
    'section.projects-main',
    { 'aria-label': 'Projects here' },
    placeHead(job, entries),
    entries.length
      ? node(
          'div.project-grid',
          {},
          entries.map((entry) => projectCard(job, { entry, folderName: folderName(entry) })),
        )
      : null,
    emptyHint(job, entries),
  );
}
