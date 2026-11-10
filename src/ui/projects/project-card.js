import { icon, node, replace, toast } from '../dom.js';
import { deleteProject, openProject } from '../session.js';
import { laterPicture, projectPicture } from './project-picture.js';
import { cardMenu } from './card-menu.js';
import { draggableProject } from './drag-to-folder.js';
import { describeEntry } from '../../model/presets.js';
import { inWords } from '../../model/told.js';

const when = (time) =>
  time ? new Date(time).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';

function openCard(job, project) {
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

// asked on the card itself, which stays where it was, so the click that asks is near the answer
function askDelete(job, project, card) {
  const remove = () =>
    deleteProject(job.app, project.id).then(job.redraw, () =>
      toast(`${project.name} could not be deleted. Try again in a moment.`),
    );

  card.draggable = false;
  replace(
    card,
    node(
      'p.card-ask',
      {},
      project.isOpen
        ? `Delete ${project.name} for good? Another project opens in its place.`
        : `Delete ${project.name} for good?`,
    ),
    node(
      'div.card-answers',
      {},
      node('button.btn.danger', { onclick: remove }, 'Delete'),
      node('button.btn', { onclick: job.redraw }, 'Keep'),
    ),
  );
  card.querySelector('.btn:not(.danger)').focus();
}

function cardText(project, folderName) {
  return [
    node('span.card-name', {}, project.name),
    node('span.view-meta.card-about', {}, describeEntry(project.entry)),
    node('span.view-meta', {}, when(project.entry.updatedAt)),
    folderName ? node('span.view-meta.card-folder', {}, icon('folder'), folderName) : null,
  ];
}

function moreButton(job, project, card) {
  const more = (event) =>
    cardMenu(job, project, {
      anchor: event.currentTarget,
      onOpen: () => openCard(job, project),
      onDelete: () => askDelete(job, project, card),
    });

  return node(
    'button.btn.quiet.icon-only.card-more',
    {
      'aria-label': `More for ${project.name}`,
      title: project.isOpen ? 'Move to a folder, delete' : 'Open, move to a folder, delete',
      onclick: more,
    },
    icon('more'),
  );
}

export function projectCard(job, { entry, folderName }) {
  const isOpen = entry.id === job.app.store.state.project.id;
  const name = isOpen ? job.app.store.state.project.name : entry.name;
  const project = { entry, id: entry.id, name, isOpen };
  const picture = isOpen
    ? projectPicture(job.pictures.ofOpen())
    : laterPicture(job.pictures.of(entry));
  const card = node('div.project-card', {
    'data-project': entry.id,
    'aria-current': isOpen ? 'true' : null,
  });

  replace(
    card,
    node(
      'button.card-open',
      {
        title: isOpen ? `${name} is open now` : `Open ${name}`,
        onclick: () => openCard(job, project),
      },
      picture,
      isOpen ? node('span.badge.card-badge', {}, 'Open now') : null,
      cardText(project, folderName),
    ),
    moreButton(job, project, card),
  );
  draggableProject(card, entry.id);

  return card;
}
