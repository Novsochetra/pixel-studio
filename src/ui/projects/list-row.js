import { node, toast } from '../dom.js';
import { deleteProject, openProject } from '../session.js';
import { laterPicture, projectPicture } from './project-picture.js';
import { folderPicker } from './folder-picker.js';
import { describeEntry } from '../../model/presets.js';
import { portraitUrl } from '../../store/portraits.js';

const when = (time) =>
  time ? new Date(time).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';

function openButton({ app, close }, entry) {
  const open = () =>
    openProject(app, entry).then(
      () => {
        toast(`Opened ${entry.name}`);
        close();
      },
      (error) => toast(error.message),
    );

  return node('button.btn', { onclick: open }, 'Open');
}

function deleteButton({ app, redraw }, entry) {
  let confirming = false;
  const remove = (event) => {
    if (!confirming) {
      confirming = true;
      event.currentTarget.textContent = `Delete ${entry.name} for good? Click again`;

      return;
    }

    deleteProject(app, entry.id).then(redraw, (error) => toast(error.message));
  };

  return node('button.btn.quiet', { onclick: remove }, 'Delete');
}

// the open project shows in its folder too, so a folder lists all of a game's projects
function openNowParts({ app }) {
  return {
    name: app.store.state.project.name,
    picture: projectPicture(portraitUrl(app.store.state.project)),
    actions: node('span.view-meta.open-now', {}, 'Open now'),
  };
}

function otherParts(job, entry) {
  return {
    name: entry.name,
    picture: laterPicture(job.pictures.of(entry)),
    actions: node(
      'div.group',
      { style: { gap: '4px' } },
      openButton(job, entry),
      deleteButton(job, entry),
    ),
  };
}

export function listRow(job, entry) {
  const isOpen = entry.id === job.app.store.state.project.id;
  const { name, picture, actions } = isOpen ? openNowParts(job) : otherParts(job, entry);

  return node(
    'div.version-row.project-row',
    { 'data-project': entry.id },
    picture,
    node(
      'div.project-text',
      {},
      node('div.view-name', {}, name),
      node('div.view-meta', {}, `${describeEntry(entry)} · ${when(entry.updatedAt)}`),
    ),
    folderPicker(job, entry),
    actions,
  );
}
