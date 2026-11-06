import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import {
  deleteVersion,
  listVersions,
  loadVersion,
  saveVersion,
  versionText,
} from '../store/versions.js';
import { saveFile } from './save-file.js';
import { restoreProject } from './session.js';

const when = (time) =>
  new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const kb = (size) => `${Math.max(1, Math.round(size / 1024))} KB`;

// a version of the work before something big changes it, kept without blocking the editor
export function keepVersion(app, name) {
  return saveVersion(app.backend, app.store.state.project, name, app.keys).catch(() => null);
}

async function restore(app, entry, close) {
  try {
    await keepVersion(app, 'Before going back to an earlier version');
    const project = await loadVersion(app.backend, entry, app.keys);
    await restoreProject(app, project);
    toast(`Back to "${entry.name}". Your work just before is saved as a version too.`);
    close();
  } catch (error) {
    toast(`Could not go back to "${entry.name}": ${error.message}`);
  }
}

async function download(app, entry) {
  const text = await versionText(app.backend, entry, app.keys);
  const name = `${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;

  await saveFile(name, new Blob([text], { type: 'application/json' }));
}

// asks once more before the version is gone for good
function deleteButton(app, entry, redraw) {
  let confirming = false;
  const remove = async (event) => {
    if (!confirming) {
      confirming = true;
      event.currentTarget.textContent = 'Delete? Click again';

      return;
    }

    await deleteVersion(app.backend, entry.id, app.keys).catch((error) => toast(error.message));
    redraw();
  };

  return node('button.btn.quiet', { onclick: remove }, 'Delete');
}

function row(app, entry, { redraw, close }) {
  return node(
    'div.version-row',
    {},
    node(
      'div',
      {},
      node('div.view-name', {}, entry.name),
      node('div.view-meta', {}, `${when(entry.savedAt)} · ${kb(entry.size)}`),
    ),
    node(
      'div.group',
      { style: { gap: '4px' } },
      node('button.btn', { onclick: () => restore(app, entry, close) }, 'Go back to this'),
      node('button.btn.quiet', { onclick: () => download(app, entry) }, 'Download'),
      deleteButton(app, entry, redraw),
    ),
  );
}

const NONE_YET =
  'No versions yet. One is kept before every cleaning, kit or restore, and whenever you save one here.';

export function openVersionsSheet(app) {
  const sheet = openSheet('History');
  const list = node('div.view-list');
  const name = node('input.input', {
    placeholder: 'Name this version, e.g. "New back view from the AI"',
    id: 'version-name',
    'aria-label': 'Version name',
  });
  const where =
    app.backend.kind === 'none'
      ? 'Versions last until you close this page here.'
      : 'Up to 30 versions are kept; the oldest go first.';
  const redraw = async () => {
    const versions = await listVersions(app.backend, app.keys);
    const rows = versions.map((entry) => row(app, entry, { redraw, close: sheet.close }));

    replace(list, versions.length ? rows : node('p.hint', {}, NONE_YET));
  };
  const save = async () => {
    const named = name.value.trim() || `Version of ${when(Date.now())}`;

    await saveVersion(app.backend, app.store.state.project, named, app.keys);
    name.value = '';
    toast('Version saved');
    redraw();
  };

  sheet.body.append(
    node(
      'p.hint',
      {},
      `A version is the whole project: every view, animation, layer, palette and guide. ${where}`,
    ),
    node(
      'div.group',
      { style: { gap: '6px' } },
      name,
      node('button.btn.primary', { onclick: save }, 'Save a version'),
    ),
    list,
  );
  redraw();
}
