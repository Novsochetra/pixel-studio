import { icon, node, replace, toast } from '../dom.js';
import { openSheet } from '../sheet.js';
import { addProject } from '../session.js';
import { openProjectFile } from '../downloads.js';
import { newProjectChooser } from '../start/chooser.js';
import { sampleProject } from '../sample.js';
import { currentRow } from './current-row.js';
import { listRow } from './list-row.js';
import { folderGroup } from './folder-group.js';
import { changeList } from './folder-picker.js';
import { castPictures } from './cast-pictures.js';
import { openLineUp } from './line-up-sheet.js';
import { addFolder, byFolder } from '../../store/folders.js';
import { deletePreset, readPresets } from '../../store/presets.js';

const UNREADABLE =
  'Your projects list could not be read just now, so only this one shows. Nothing was removed: reload the page to see the others.';
const ALONE =
  'Your other projects show here, each with its own views, animations, colours and history. For the next character of your game, "New character like this" sets one up as this one is, with nothing drawn.';

function listHint(app, others) {
  if (app.index.unreadable) {
    return node('p.hint', {}, UNREADABLE);
  }

  return others.length ? null : node('p.hint', {}, ALONE);
}

async function startSection(app, sheet) {
  const opened = (project) =>
    addProject(app, project).then(sheet.close, (error) => toast(error.message));
  const chooser = newProjectChooser({
    presets: await readPresets(app.backend),
    onCreate: opened,
    onDeletePreset: (preset) =>
      deletePreset(app.backend, preset.id).catch((error) =>
        toast(`The preset could not be forgotten: ${error.message}`),
      ),
  });

  return node(
    'details.start-section',
    { open: app.index.list.length < 2 },
    node('summary', {}, 'New project'),
    chooser,
    node(
      'button.btn.quiet',
      { onclick: async () => opened(await sampleProject()) },
      'Try the example character',
    ),
  );
}

function listBody(job) {
  const { index, store } = job.app;

  if (!index.folders?.length) {
    const others = index.list.filter((entry) => entry.id !== store.state.project.id);

    return [others.map((entry) => listRow(job, entry)), listHint(job.app, others)];
  }

  const groups = byFolder(index).filter((group) => group.folder || group.entries.length);

  return [groups.map((group) => folderGroup(job, group)), listHint(job.app, index.list)];
}

function newFolder(job, list) {
  const folder = changeList(job, (index) => addFolder(index));

  list.querySelector(`[data-folder="${folder.id}"] .folder-rename`)?.click();
}

function bottomButtons(job, list) {
  return node(
    'div.group',
    { style: { gap: '6px', flexWrap: 'wrap' } },
    node(
      'button.btn.quiet',
      {
        title: 'Every project side by side at one pixel size, to check their sizes agree',
        onclick: () => job.lineUp(job.app.index.list),
      },
      'Line them up…',
    ),
    node('button.btn.quiet', { onclick: () => newFolder(job, list) }, icon('folder'), 'New folder'),
    node(
      'button.btn.quiet',
      { onclick: () => openProjectFile(job.app, job.close) },
      'Open a project file…',
    ),
  );
}

export function openProjectsSheet(app) {
  const sheet = openSheet('Projects');
  const list = node('div.view-list');
  const pictures = castPictures(app);
  const job = {
    app,
    pictures,
    close: sheet.close,
    redraw: () => replace(list, currentRow(job), listBody(job)),
    // one sheet at a time: two open sheets would both close on one Escape
    lineUp: (entries) => {
      sheet.close();
      openLineUp(pictures.cast(entries));
    },
  };

  sheet.body.append(list, bottomButtons(job, list));
  job.redraw();
  startSection(app, sheet).then((section) => sheet.body.append(section));
}
