import { node, toast } from '../dom.js';
import { changeStructure } from '../actions.js';
import { addProject, deleteProject, openProject } from '../session.js';
import { saveProject } from '../downloads.js';
import { backgroundUrl } from '../preview-background.js';
import { laterPicture, projectPicture } from './project-picture.js';
import { describeEntry, describeProject, defaultName } from '../../model/presets.js';
import { presetFromProject } from '../../model/preset-from-project.js';
import { blankCopy } from '../../model/cast.js';
import { projectFileText, readProjectFile } from '../../store/project-file.js';
import { savePreset } from '../../store/presets.js';
import { portraitUrl } from '../../store/portraits.js';

const when = (time) =>
  time ? new Date(time).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';

// A project made from the open one joins the list and opens, sharing its preview background; its
// name is ready to type over where there is a keyboard.
async function addMadeFrom(app, redraw, { make, said }) {
  const { project } = app.store.state;

  try {
    const background = await backgroundUrl(app);
    const made = await make(project);

    await addProject(app, made, background);
    toast(said(made.name, project.name));
    redraw();

    if (matchMedia('(pointer: fine)').matches) {
      document.getElementById('current-project-name')?.select();
    }
  } catch (error) {
    toast(error.message);
  }
}

const duplicate = (app, redraw) =>
  addMadeFrom(app, redraw, {
    make: async (project) => ({
      ...(await readProjectFile(projectFileText(project))),
      name: `${project.name} copy`,
    }),
    said: (name) => `Made "${name}" and opened it`,
  });

// the next character of a game: the same frames to draw, nothing drawn on them
const newLikeThis = (app, redraw) =>
  addMadeFrom(app, redraw, {
    make: (project) => blankCopy(project, defaultName(project)),
    said: (name, from) =>
      `Made "${name}" with ${from}'s canvas, views and animations, nothing drawn. Name it above.`,
  });

// its kind, views, canvas, parts, animation names and game settings start new projects
function keepAsPreset(app) {
  const preset = presetFromProject(app.store.state.project);

  savePreset(app.backend, preset).then(
    () => toast(`"${preset.label}" is now a preset: pick it when you start a new project.`),
    (error) => toast(`The preset could not be saved: ${error.message}`),
  );
}

const LIKE_THIS =
  'Same canvas, views, animations and frames, with nothing drawn: the next one for your game';

function currentActions(app, redraw) {
  const { project } = app.store.state;

  return node(
    'div.group',
    { style: { gap: '4px', flexWrap: 'wrap' } },
    node(
      'button.btn.quiet',
      { title: LIKE_THIS, onclick: () => newLikeThis(app, redraw) },
      `${defaultName(project)} like this`,
    ),
    node('button.btn.quiet', { onclick: () => duplicate(app, redraw) }, 'Duplicate'),
    node('button.btn.quiet', { onclick: () => saveProject(app) }, 'Save as file'),
    node('button.btn.quiet', { onclick: () => keepAsPreset(app) }, 'Save as a preset'),
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
    'div.version-row.project-row',
    {},
    projectPicture(portraitUrl(project)),
    node(
      'div.field.project-text',
      {},
      node('span', {}, `Open now · ${describeProject(project)} · ${size}`),
      rename,
    ),
    currentActions(app, redraw),
  );
}

export function otherRow(app, entry, { redraw, close, picture }) {
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
    'div.version-row.project-row',
    {},
    laterPicture(picture),
    node(
      'div.project-text',
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
