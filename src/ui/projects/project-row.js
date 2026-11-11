import { icon, node, replace, toast } from '../dom.js';
import { deleteProject, openProject } from '../session.js';
import { laterPicture, projectPicture } from './project-picture.js';
import { rowMenu } from './row-menu.js';
import { duplicateStored, renameOnRow } from './row-changes.js';
import { draggableProject } from './drag-to-folder.js';
import { describeEntry } from '../../model/presets.js';
import { inWords } from '../../model/told.js';

const when = (time) =>
  time ? new Date(time).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';

function openRow(job, project) {
  if (project.isOpen) {
    job.close();

    return Promise.resolve();
  }

  return openProject(job.app, project.entry).then(
    () => {
      toast(`Opened ${project.name}`);
      job.close();
    },
    (error) => toast(inWords(error, `${project.name} could not be opened. Try again in a moment.`)),
  );
}

// asked on the row itself, which stays where it was, so the click that asks is near the answer
function askDelete(job, project, row) {
  const remove = () =>
    deleteProject(job.app, project.id).then(job.redraw, () =>
      toast(`${project.name} could not be deleted. Try again in a moment.`),
    );

  row.draggable = false;
  replace(
    row,
    node(
      'p.row-ask',
      {},
      project.isOpen
        ? `Delete ${project.name} for good? Another project opens in its place.`
        : `Delete ${project.name} for good?`,
    ),
    node(
      'div.row-answers',
      {},
      node('button.btn.danger', { onclick: remove }, 'Delete'),
      node('button.btn', { onclick: job.redraw }, 'Keep'),
    ),
  );
  // Esc answers the question: it does not go on to close Projects
  row.onkeydown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      job.redraw();
      // the keys go back to the row's own menu: drawn again, the row had left them on nothing
      document.querySelector(`.project-row[data-project="${project.id}"] .row-more`)?.focus();
    }
  };
  row.querySelector('.btn:not(.danger)').focus();
}

// what it is and when it was last worked on, on one line as a phone's lists have it
function rowText(project, folderName) {
  const about = [describeEntry(project.entry), when(project.entry.updatedAt)].filter(Boolean);

  return node(
    'span.row-text',
    {},
    node('span.row-name', {}, project.name),
    node('span.view-meta.row-about', {}, about.join(' · ')),
    folderName ? node('span.view-meta.row-folder', {}, icon('folder'), folderName) : null,
  );
}

function moreButton(job, project, row) {
  const more = (event) =>
    rowMenu(job, project, {
      anchor: event.currentTarget,
      onOpen: () => openRow(job, project),
      onDelete: () => askDelete(job, project, row),
      onRename: () => renameOnRow(job, project, row),
      onDuplicate: () => duplicateStored(job, project),
    });

  return node(
    'button.btn.quiet.icon-only.row-more',
    {
      'aria-label': `More for ${project.name}`,
      title: project.isOpen
        ? 'Move to a folder, delete'
        : 'Open, rename, duplicate, move to a folder, delete',
      onclick: more,
    },
    icon('more'),
  );
}

export function projectRow(job, { entry, folderName }) {
  const isOpen = entry.id === job.app.store.state.project.id;
  const name = isOpen ? job.app.store.state.project.name : entry.name;
  const project = { entry, id: entry.id, name, isOpen };
  const picture = isOpen
    ? projectPicture(job.pictures.ofOpen())
    : laterPicture(job.pictures.of(entry));
  const row = node('div.project-row', {
    role: 'listitem',
    'data-project': entry.id,
    'aria-current': isOpen ? 'true' : null,
  });

  replace(
    row,
    node(
      'button.row-open',
      {
        title: isOpen ? `${name} is open now` : `Open ${name}`,
        onclick: () => openRow(job, project),
      },
      picture,
      rowText(project, folderName),
      isOpen ? node('span.row-now', {}, icon('check'), node('span', {}, 'Open now')) : null,
    ),
    moreButton(job, project, row),
  );
  draggableProject(row, entry.id);

  return row;
}
