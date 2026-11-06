import { node, toast } from '../dom.js';
import { changeStructure } from '../actions.js';
import { addProject, deleteProject, openProject } from '../session.js';
import { saveProject } from '../downloads.js';
import { backgroundUrl } from '../preview-background.js';
import { describeEntry, describeProject } from '../../model/presets.js';
import { presetFromProject } from '../../model/preset-from-project.js';
import { projectFileText, readProjectFile } from '../../store/project-file.js';
import { savePreset } from '../../store/presets.js';

const when = (time) =>
  time ? new Date(time).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';

async function duplicate(app, redraw) {
  const { project } = app.store.state;

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
}

// its kind, views, canvas, parts, animation names and game settings start new projects
function keepAsPreset(app) {
  const preset = presetFromProject(app.store.state.project);
  savePreset(app.backend, preset).then(
    () => toast(`"${preset.label}" is now a preset: pick it when you start a new project.`),
    (error) => toast(`The preset could not be saved: ${error.message}`),
  );
}

export function currentRow(app, redraw) {
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
  const size = `${project.canvas.width}×${project.canvas.height}`;

  return node(
    'div.version-row',
    {},
    node(
      'div.field',
      { style: { flex: '1', minWidth: '200px' } },
      node('span', {}, `Open now · ${describeProject(project)} · ${size}`),
      rename,
    ),
    node(
      'div.group',
      { style: { gap: '4px', flexWrap: 'wrap' } },
      node('button.btn.quiet', { onclick: () => duplicate(app, redraw) }, 'Duplicate'),
      node('button.btn.quiet', { onclick: () => saveProject(app) }, 'Save as file'),
      node('button.btn.quiet', { onclick: () => keepAsPreset(app) }, 'Save as a preset'),
    ),
  );
}

export function otherRow(app, entry, { redraw, close }) {
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
      node('div.view-meta', {}, `${describeEntry(entry)} · ${when(entry.updatedAt)}`),
    ),
    node(
      'div.group',
      { style: { gap: '4px' } },
      node('button.btn', { onclick: open }, 'Open'),
      node('button.btn.quiet', { onclick: remove }, 'Delete'),
    ),
  );
}
