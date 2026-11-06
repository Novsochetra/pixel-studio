import { node, replace, toast } from '../dom.js';
import { openSheet } from '../sheet.js';
import { addProject } from '../session.js';
import { openProjectFile } from '../downloads.js';
import { newProjectChooser } from '../start/chooser.js';
import { sampleProject } from '../sample.js';
import { currentRow, otherRow } from './project-rows.js';
import { deletePreset, readPresets } from '../../store/presets.js';

const UNREADABLE =
  'Your projects list could not be read just now, so only this one shows. Nothing was removed: reload the page to see the others.';
const ALONE =
  'Your other projects show here. Each keeps its own views, animations, colours and history.';

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
    onDeletePreset: (preset) => deletePreset(app.backend, preset.id),
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

export function openProjectsSheet(app) {
  const sheet = openSheet('Projects');
  const list = node('div.view-list');
  const redraw = () => {
    const others = app.index.list.filter((entry) => entry.id !== app.store.state.project.id);
    replace(
      list,
      currentRow(app, redraw),
      others.map((entry) => otherRow(app, entry, { redraw, close: sheet.close })),
      listHint(app, others),
    );
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
  );
  redraw();
  startSection(app, sheet).then((section) => sheet.body.append(section));
}
