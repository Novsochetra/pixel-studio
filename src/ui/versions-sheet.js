import { h, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { deleteVersion, listVersions, loadVersion, saveVersion, versionText } from '../store/versions.js';
import { saveFile } from './save-file.js';
import { restoreProject } from './session.js';

const when = (time) => new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const kb = (size) => `${Math.max(1, Math.round(size / 1024))} KB`;

// a version of the work before something big changes it, kept without blocking the editor
export function keepVersion(app, name) {
  return saveVersion(app.backend, app.store.state.project, name, app.keys).catch(() => null);
}

function row(app, entry, redraw, close) {
  let confirming = false;
  const restore = async () => {
    await keepVersion(app, 'Before going back to an earlier version');
    const project = await loadVersion(app.backend, entry, app.keys);
    await restoreProject(app, project);
    toast(`Back to "${entry.name}". Your work just before is saved as a version too.`);
    close();
  };
  const download = async () => saveFile(`${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, new Blob([await versionText(app.backend, entry, app.keys)], { type: 'application/json' }));
  const remove = async (event) => {
    if (!confirming) {
      confirming = true;
      event.currentTarget.textContent = 'Delete? Click again';

      return;
    }

    await deleteVersion(app.backend, entry.id, app.keys);
    redraw();
  };

  return h(
    'div.version-row',
    {},
    h('div', {}, h('div.view-name', {}, entry.name), h('div.view-meta', {}, `${when(entry.savedAt)} · ${kb(entry.size)}`)),
    h('div.group', { style: { gap: '4px' } }, h('button.btn', { onclick: restore }, 'Go back to this'), h('button.btn.quiet', { onclick: download }, 'Download'), h('button.btn.quiet', { onclick: remove }, 'Delete')),
  );
}

export function openVersionsSheet(app) {
  const sheet = openSheet('History');
  const list = h('div.view-list');
  const name = h('input.input', { placeholder: 'Name this version, e.g. "New back from ChatGPT"', id: 'version-name', 'aria-label': 'Version name' });
  const where = app.backend.kind === 'none' ? 'Versions last until you close this page here.' : 'Up to 30 versions are kept; the oldest go first.';

  const redraw = async () => {
    const versions = await listVersions(app.backend, app.keys);
    replace(list, versions.length ? versions.map((entry) => row(app, entry, redraw, sheet.close)) : h('p.hint', {}, 'No versions yet. One is kept before every cleaning, kit or restore, and whenever you save one here.'));
  };
  const save = async () => {
    await saveVersion(app.backend, app.store.state.project, name.value.trim() || `Version of ${when(Date.now())}`, app.keys);
    name.value = '';
    toast('Version saved');
    redraw();
  };

  sheet.body.append(
    h('p.hint', {}, `A version is the whole project: every view, animation, layer, palette and guide. ${where}`),
    h('div.group', { style: { gap: '6px' } }, name, h('button.btn.primary', { onclick: save }, 'Save a version')),
    list,
  );
  redraw();
}
