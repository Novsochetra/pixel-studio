import { icon, node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { keepFocus } from './keep-focus.js';
import {
  deleteVersion,
  listVersions,
  loadVersion,
  saveVersion,
  versionText,
} from '../store/versions.js';
import { saveFile } from './save-file.js';
import { fileSlug } from './file-name.js';
import { restoreProject } from './session.js';
import { inWords } from '../model/told.js';
import { askDelete } from './ask-delete.js';

const when = (time) =>
  new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const kb = (size) => `${Math.max(1, Math.round(size / 1024))} KB`;

// a version of the work before something big changes it, kept without blocking the editor
// The version is taken at once, as the project stands when this is called: callers change the
// project straight after. The project itself is written too: a version of an example nobody has
// edited would otherwise belong to a project that is not there after a reload.
export function keepVersion(app, name) {
  const kept = saveVersion(app.backend, app.store.state.project, name, app.keys);

  return Promise.all([kept, app.saver.flushNow()]).then(
    ([id]) => id,
    () => null,
  );
}

async function restore(app, entry, close) {
  try {
    await keepVersion(app, 'Before going back to an earlier version');
    const project = await loadVersion(app.backend, entry, app.keys);
    await restoreProject(app, project, { label: `Go back to "${entry.name}"` });
    toast(`Back to "${entry.name}". Undo returns to your work just before, a version too.`);
    close();
  } catch (error) {
    toast(inWords(error, `Could not go back to "${entry.name}". Try again in a moment.`));
  }
}

async function download(app, entry) {
  const text = await versionText(app.backend, entry, app.keys);
  const { project } = app.store.state;
  const name = `${fileSlug(project.name, 'project')}-${fileSlug(entry.name, 'version')}.json`;

  await saveFile(name, new Blob([text], { type: 'application/json' }));
}

// asks before the version is gone for good
function deleteButton(app, entry, redraw) {
  const place = node('span.ask-place');
  const remove = async () => {
    await deleteVersion(app.backend, entry.id, app.keys).catch(() =>
      toast('That version could not be deleted. Try again in a moment.'),
    );
    redraw();
  };
  const ask = () => askDelete(place, { question: 'Delete this version?', onDelete: remove });

  place.append(
    node(
      'button.btn.quiet.icon-only',
      { onclick: ask, title: 'Delete this version', 'aria-label': `Delete ${entry.name}` },
      icon('trash'),
    ),
  );

  return place;
}

function row(app, entry, { redraw, close }) {
  const goBack = () => restore(app, entry, close);

  return node(
    'div.list-row.version-row',
    {},
    node(
      'div.version-text',
      {},
      node('div.view-name', {}, entry.name),
      node('div.view-meta', {}, `${when(entry.savedAt)} · ${kb(entry.size)}`),
    ),
    node(
      'div.group',
      { style: { gap: '2px' } },
      node(
        'button.btn.quiet.version-back',
        { onclick: goBack, 'aria-label': `Go back to this: ${entry.name}` },
        'Go back',
      ),
      node(
        'button.btn.quiet.icon-only',
        {
          onclick: () => download(app, entry),
          title: 'Download this version',
          'aria-label': `Download ${entry.name}`,
        },
        icon('download'),
      ),
      deleteButton(app, entry, redraw),
    ),
  );
}

const NONE_YET = 'No versions yet. One is kept before every cleaning, kit or restore.';

const nameField = (onEnter) =>
  node('input.input', {
    placeholder: 'Name this version',
    id: 'version-name',
    'aria-label': 'Version name',
    onkeydown: (event) => event.key === 'Enter' && onEnter(),
  });

// saved in History by hand: kept past the versions kept on their own (versionsKept)
const keepByHand = (app, typed) =>
  keepVersion(app, { name: typed.trim() || `Version of ${when(Date.now())}`, byHand: true });

export function openVersionsSheet(app) {
  const sheet = openSheet('History');
  const list = node('div.list-rows.version-list');
  const name = nameField(() => save());
  const where =
    app.backend.kind === 'none'
      ? 'Versions last until you close this page here.'
      : 'Up to 30 versions are kept: the oldest go first, and those saved here by hand last.';
  const redraw = async () => {
    const versions = await listVersions(app.backend, app.keys);
    const rows = versions.map((entry) => row(app, entry, { redraw, close: sheet.close }));
    const held = list.contains(document.activeElement);

    // a version deleted takes the button that deleted it: the keys go on from the next row
    keepFocus(list, () =>
      replace(list, versions.length ? rows : node('p.list-note.version-none', {}, NONE_YET)),
    );

    // the last version deleted leaves no row for the keys: they go to the name of the next
    if (held && document.activeElement === document.body) {
      name.focus();
    }
  };
  const save = async () => {
    const kept = await keepByHand(app, name.value);

    name.value = '';
    toast(kept ? 'Version saved' : 'The version could not be saved just now. Try again.');
    redraw();
  };

  sheet.body.append(
    node(
      'div.version-save',
      {},
      name,
      node('button.btn.primary', { onclick: save }, 'Save a version'),
    ),
    list,
    node('p.list-note', {}, `A version is the whole project. ${where}`),
    // a window that applies nothing ends in Close, as Outfits and the sprite sheet do
    node('div.sheet-actions', {}, node('button.btn', { onclick: sheet.close }, 'Close')),
  );
  redraw();
}
