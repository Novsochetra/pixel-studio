import { node, toast } from '../dom.js';
import { changeStructure } from '../actions.js';
import { afterPress } from '../after-press.js';
import { hasKeyboard } from '../platform-keys.js';
import { addProject } from '../session.js';
import { saveProject } from '../downloads.js';
import { openCanvasSizeSheet } from '../canvas-size-sheet.js';
import { projectPicture } from './project-picture.js';
import { actionRow, listGroup, valueRow } from '../list-group.js';
import { describeProject, defaultName } from '../../model/presets.js';
import { presetFromProject } from '../../model/preset-from-project.js';
import { blankCopy } from '../../model/cast.js';
import { projectFileText, readProjectFile } from '../../store/project-file.js';
import { savePreset } from '../../store/presets.js';
import { folderOf } from '../../store/folders.js';
import { inWords } from '../../model/told.js';

const LIKE_THIS =
  'the same canvas, views, animations and frames, with nothing drawn: the next one for your game';

async function addMadeFrom({ app, redraw }, { make, said }) {
  const { project } = app.store.state;

  try {
    const made = await make(project);

    await addProject(app, made);
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

// one sheet at a time: two open sheets would both close on one Escape
function canvasRow(job) {
  const { canvas } = job.app.store.state.project;
  const resize = () => {
    job.close();
    openCanvasSizeSheet(job.app);
  };

  return actionRow('Canvas', resize, {
    title: 'Grow or shrink the canvas of every view and frame',
    value: `${canvas.width}×${canvas.height}`,
  });
}

// Done with a name on a keyboard, the keys go to the page's own tab, in the window still: left
// on nothing, the next Tab began the window again. A phone's keys are put away.
function leaveField(field) {
  const tab = hasKeyboard()
    ? field.closest('.sheet')?.querySelector('.projects-nav [aria-pressed="true"]')
    : null;

  if (tab) {
    tab.focus();
  } else {
    field.blur();
  }
}

function renameField({ app, redraw }) {
  const { project } = app.store.state;

  return node('input.list-field', {
    value: project.name,
    id: 'current-project-name',
    'aria-label': 'Project name',
    // The keyboard's return key says the name is done, as it does for a layer's. Escape puts
    // the name back and stays in the window: it kept what was typed, and closed Projects.
    onkeydown: (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.target.value = project.name;
      }

      if (event.key === 'Enter' || event.key === 'Escape') {
        leaveField(event.target);
      }
    },
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

function about(job) {
  const { app } = job;
  const { project } = app.store.state;
  const folderId = folderOf(app.index, project.id);
  const folder = app.index.folders.find((each) => each.id === folderId);

  return listGroup(
    {},
    node('label.list-row', {}, node('span.list-label', {}, 'Name'), renameField(job)),
    valueRow('Kind', describeProject(project)),
    canvasRow(job),
    valueRow('Folder', folder?.name ?? 'None'),
  );
}

const PRESET_NOTE = 'A preset is offered each time you start a new project.';

export function thisProject(job) {
  const { app } = job;

  return node(
    'div.current-project',
    {},
    projectPicture(job.pictures.ofOpen()),
    about(job),
    listGroup(
      { title: 'Start another', note: `Like this: ${LIKE_THIS}.` },
      actionRow(`${defaultName(app.store.state.project)} like this`, () => newLikeThis(job)),
      actionRow('Duplicate', () => duplicate(job)),
    ),
    listGroup(
      { title: 'Keep', note: PRESET_NOTE },
      actionRow('Save as file', () => saveProject(app)),
      actionRow('Save as a preset', () => keepAsPreset(job)),
    ),
  );
}
