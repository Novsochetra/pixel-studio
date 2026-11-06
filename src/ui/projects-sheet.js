import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { changeStructure } from './actions.js';
import { newProjectForm } from './new-project-form.js';
import { addProject, deleteProject, openProject } from './session.js';
import { openProjectFile, saveProject } from './downloads.js';
import { PROFILES } from '../model/profiles.js';
import { projectFileText, readProjectFile } from '../store/project-file.js';
import { backgroundUrl } from './preview-background.js';

const when = (time) =>
  time ? new Date(time).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';

function currentRow(app, redraw) {
  const { project } = app.store.state;
  const rename = node('input.input', {
    value: project.name,
    id: 'current-project-name',
    'aria-label': 'Project name',
    onchange: (event) => {
      project.name = event.target.value.trim() || project.name;
      changeStructure(app, 'project');
      redraw();
    },
  });
  const duplicate = async () => {
    try {
      const background = await backgroundUrl(app);
      const copy = await readProjectFile(projectFileText(project));
      copy.name = `${project.name} copy`;
      await addProject(app, copy, background);
      toast(`Made "${copy.name}" and opened it`);
      redraw();
    } catch (error) {
      toast(error.message);
    }
  };

  return node(
    'div.version-row',
    {},
    node(
      'div.field',
      { style: { flex: '1', minWidth: '200px' } },
      node(
        'span',
        {},
        `Open now · ${PROFILES[project.profile]?.label ?? ''} · ${project.canvas.width}×${project.canvas.height}`,
      ),
      rename,
    ),
    node(
      'div.group',
      { style: { gap: '4px', flexWrap: 'wrap' } },
      node('button.btn.quiet', { onclick: duplicate }, 'Duplicate'),
      node('button.btn.quiet', { onclick: () => saveProject(app) }, 'Save as file'),
    ),
  );
}

function otherRow(app, entry, redraw, close) {
  let confirming = false;
  const open = () =>
    openProject(app, entry).then(
      () => {
        toast(`Opened ${entry.name}`);
        close();
      },
      (error) => toast(error.message),
    );
  const remove = (event) => {
    if (!confirming) {
      confirming = true;
      event.currentTarget.textContent = `Delete ${entry.name} for good? Click again`;

      return;
    }

    deleteProject(app, entry.id).then(redraw, (error) => toast(error.message));
  };

  return node(
    'div.version-row',
    {},
    node(
      'div',
      {},
      node('div.view-name', {}, entry.name),
      node(
        'div.view-meta',
        {},
        `${PROFILES[entry.profile]?.label ?? 'Any game'} · ${when(entry.updatedAt)}`,
      ),
    ),
    node(
      'div.group',
      { style: { gap: '4px' } },
      node('button.btn', { onclick: open }, 'Open'),
      node('button.btn.quiet', { onclick: remove }, 'Delete'),
    ),
  );
}

export function openProjectsSheet(app) {
  const sheet = openSheet('Projects');
  const list = node('div.view-list');
  const redraw = () => {
    const others = app.index.list.filter((entry) => entry.id !== app.store.state.project.id);
    replace(
      list,
      currentRow(app, redraw),
      others.map((entry) => otherRow(app, entry, redraw, sheet.close)),
      app.index.unreadable
        ? node(
            'p.hint',
            {},
            'Your projects list could not be read just now, so only this one shows. Nothing was removed: reload the page to see the others.',
          )
        : null,
      others.length || app.index.unreadable
        ? null
        : node(
            'p.hint',
            {},
            'Your other projects show here. Each keeps its own views, animations, colours and history.',
          ),
    );
  };
  const create = async (project) => {
    await addProject(app, project);
    sheet.close();
  };

  sheet.body.append(
    list,
    node(
      'div.group',
      { style: { gap: '6px' } },
      node(
        'button.btn.quiet',
        { onclick: () => openProjectFile(app, sheet.close) },
        'Open a project file…',
      ),
    ),
    node(
      'details',
      { open: app.index.list.length < 2 },
      node('summary', {}, 'New project'),
      newProjectForm(create),
    ),
  );
  redraw();
}
