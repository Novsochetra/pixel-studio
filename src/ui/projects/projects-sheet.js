import { node, replace, toast } from '../dom.js';
import { openSheet } from '../sheet.js';
import { addProject } from '../session.js';
import { openProjectFile } from '../downloads.js';
import { newProjectChooser } from '../start/chooser.js';
import { sampleProject } from '../sample.js';
import { currentRow, otherRow } from './project-rows.js';
import { castPictures } from './project-picture.js';
import { openLineUp } from './line-up-sheet.js';
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

// every project side by side, in place of this list
function lineUpButton(pictures, close) {
  return node(
    'button.btn.quiet',
    {
      title: 'Every project side by side at one pixel size, to check their sizes agree',
      onclick: () => {
        close();
        openLineUp(pictures.cast());
      },
    },
    'Line them up…',
  );
}

export function openProjectsSheet(app) {
  const sheet = openSheet('Projects');
  const list = node('div.view-list');
  const pictures = castPictures(app);
  const redraw = () => {
    const others = app.index.list.filter((entry) => entry.id !== app.store.state.project.id);

    replace(
      list,
      currentRow(app, redraw),
      others.map((entry) =>
        otherRow(app, entry, { redraw, close: sheet.close, picture: pictures.of(entry) }),
      ),
      listHint(app, others),
    );
  };

  sheet.body.append(
    list,
    node(
      'div.group',
      { style: { gap: '6px' } },
      lineUpButton(pictures, sheet.close),
      node(
        'button.btn.quiet',
        { onclick: () => openProjectFile(app, sheet.close) },
        'Open a project file…',
      ),
    ),
  );
  redraw();
  startSection(app, sheet).then((section) => sheet.body.append(section));
}
