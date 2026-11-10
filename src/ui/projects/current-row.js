import { node, toast } from '../dom.js';
import { changeStructure } from '../actions.js';
import { afterPress } from '../after-press.js';
import { addProject } from '../session.js';
import { saveProject } from '../downloads.js';
import { openCanvasSizeSheet } from '../canvas-size-sheet.js';
import { backgroundUrl } from '../preview-background.js';
import { projectPicture } from './project-picture.js';
import { describeProject, defaultName } from '../../model/presets.js';
import { presetFromProject } from '../../model/preset-from-project.js';
import { blankCopy } from '../../model/cast.js';
import { projectFileText, readProjectFile } from '../../store/project-file.js';
import { savePreset } from '../../store/presets.js';
import { folderOf } from '../../store/folders.js';
import { inWords } from '../../model/told.js';

const LIKE_THIS =
  'Same canvas, views, animations and frames, with nothing drawn: the next one for your game';

async function addMadeFrom({ app, redraw }, { make, said }) {
  const { project } = app.store.state;

  try {
    const background = await backgroundUrl(app);
    const made = await make(project);

    await addProject(app, made, background);
    toast(said(made.name, project.name));
    redraw();

    // a phone's keyboard would cover the list, so the name takes focus only with a pointer
    if (matchMedia('(pointer: fine)').matches) {
      document.getElementById('current-project-name')?.select();
    }
  } catch (error) {
    toast(inWords(error, 'The new project could not be made. Try again in a moment.'));
  }
}

const duplicate = (job) =>
  addMadeFrom(job, {
    make: async (project) => ({
      ...(await readProjectFile(projectFileText(project))),
      name: `${project.name} copy`,
    }),
    said: (name) => `Made "${name}" and opened it`,
  });

const newLikeThis = (job) =>
  addMadeFrom(job, {
    make: (project) => blankCopy(project, defaultName(project)),
    said: (name, from) =>
      `Made "${name}" with ${from}'s canvas, views and animations, nothing drawn. Name it above.`,
  });

function keepAsPreset({ app, showStart }) {
  const preset = presetFromProject(app.store.state.project);

  savePreset(app.backend, preset).then(
    () => {
      toast(`"${preset.label}" is now a preset: pick it when you start a new project.`);
      showStart();
    },
    () => toast('The preset could not be saved. Try again in a moment.'),
  );
}

function currentActions(job) {
  const { app } = job;

  return node(
    'div.group',
    { style: { gap: '4px', flexWrap: 'wrap' } },
    node(
      'button.btn.quiet',
      { title: LIKE_THIS, onclick: () => newLikeThis(job) },
      `${defaultName(app.store.state.project)} like this`,
    ),
    node('button.btn.quiet', { onclick: () => duplicate(job) }, 'Duplicate'),
    node(
      'button.btn.quiet',
      {
        title: 'Grow or shrink the canvas of every view and frame',
        onclick: () => {
          // one sheet at a time: two open sheets would both close on one Escape
          job.close();
          openCanvasSizeSheet(app);
        },
      },
      'Canvas size…',
    ),
    node('button.btn.quiet', { onclick: () => saveProject(app) }, 'Save as file'),
    node('button.btn.quiet', { onclick: () => keepAsPreset(job) }, 'Save as a preset'),
  );
}

function renameField({ app, redraw }) {
  const { project } = app.store.state;

  return node('input.input', {
    value: project.name,
    id: 'current-project-name',
    'aria-label': 'Project name',
    // the keyboard's return key says the name is done, as it does for a layer's
    onkeydown: (event) => event.key === 'Enter' && event.target.blur(),
    onchange: (event) => {
      const name = event.target.value.trim() || project.name;

      // drawn again only once the click that took the focus has landed on what it was for
      afterPress(() => {
        project.name = name;
        changeStructure(app, 'project');
        redraw();
      });
    },
  });
}

function aboutOpen({ app }) {
  const { project } = app.store.state;
  const folderId = folderOf(app.index, project.id);
  const folder = app.index.folders.find((each) => each.id === folderId);
  const size = `${project.canvas.width}×${project.canvas.height}`;

  return [`Open now · ${describeProject(project)} · ${size}`, folder ? ` · in ${folder.name}` : ''];
}

export function currentRow(job) {
  return node(
    'div.current-project',
    {},
    projectPicture(job.pictures.ofOpen()),
    node(
      'div.field.project-text',
      {},
      node('span', {}, aboutOpen(job)),
      renameField(job),
      currentActions(job),
    ),
  );
}
