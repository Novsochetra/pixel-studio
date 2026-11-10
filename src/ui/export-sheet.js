import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { currentAnimation } from './actions.js';
import { saveFile } from './save-file.js';
import { presetSettings, presetsFor, sane } from './export-settings.js';
import { saidWarning, summary } from './export/export-summary.js';
import {
  formatButtons,
  manifestBlock,
  mirroredToggle,
  numberField,
  sheetPreview,
} from './export/export-parts.js';
import { buildSheet } from '../export/sheet.js';
import { spritePng } from '../io/images.js';
import { gameOf } from '../model/presets.js';
import { mirrorsOf } from '../model/directions.js';
import { placementOf } from '../model/kinds.js';
import { inWords } from '../model/told.js';

function warn(warnings) {
  if (warnings.length) {
    const more = warnings.length > 3 ? ` (and ${warnings.length - 3} more)` : '';

    toast(`Saved, but check: ${warnings.slice(0, 3).join(' ')}${more}`);
  }
}

// the export settings as last chosen for this project, else the art fitted
function startingChoice(state) {
  const saved = state.project.exportSettings;
  const preset = presetsFor(state.project).some(([id]) => id === saved?.preset)
    ? saved.preset
    : 'fit';

  return {
    preset,
    settings: sane({ ...presetSettings(state, preset), ...(saved?.custom ?? {}) }),
    includeMirrored: saved?.includeMirrored ?? false,
  };
}

function frameFields(state, choice, set) {
  const anchor = placementOf(state.project).place === 'feet' ? 'Feet' : 'Anchor';
  const { settings } = choice;
  const fields = [
    ['Frame width', 'frameWidth', 'frame-width'],
    ['Frame height', 'frameHeight', 'frame-height'],
    [`${anchor} x in frame`, 'anchorX', 'anchor-x'],
    [`${anchor} y in frame`, 'anchorY', 'anchor-y'],
  ];

  return node(
    'div.compare',
    { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' } },
    fields.map(([label, key, id]) =>
      numberField(label, settings[key], id, (value) => set({ [key]: value })),
    ),
  );
}

function presetButtons(state, choice, pick) {
  return node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Frame size' },
    presetsFor(state.project).map(([id, label]) =>
      node(
        'button',
        { 'aria-pressed': String(choice.preset === id), onclick: () => pick(id) },
        label,
      ),
    ),
  );
}

function drawExport(slot, job) {
  const { state, animation, choice, change } = job;
  const { gamePack } = gameOf(state.project);
  const mirrors = Object.keys(mirrorsOf(state.project)).length > 0;
  const result = buildSheet(state.project, animation, {
    ...choice.settings,
    includeMirrored: choice.includeMirrored,
  });
  const download = async () => {
    const filename = `${result.name}.png`;

    if (await saveFile(filename, await spritePng(result.sheet))) {
      warn(result.warnings.map((warning) => saidWarning(state.project, result, warning)));
    }
  };
  const pick = (id) =>
    change({ preset: id, settings: id === 'custom' ? choice.settings : presetSettings(state, id) });
  const edit = (patch) =>
    change({ preset: 'custom', settings: sane({ ...choice.settings, ...patch }) });
  const toggle = mirroredToggle(choice.includeMirrored, {
    gamePack,
    onChange: (includeMirrored) => change({ includeMirrored }),
  });

  replace(
    slot,
    presetButtons(state, choice, pick),
    frameFields(state, choice, edit),
    mirrors ? toggle : null,
    node('div', { style: { overflowX: 'auto' } }, sheetPreview(result)),
    summary(result, animation, state),
    gamePack ? manifestBlock(result, choice.settings) : null,
    formatButtons(job.run, gamePack),
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: job.close }, 'Close'),
      node('button.btn.primary', { onclick: download }, `Download ${result.name}.png`),
    ),
  );
}

// The open animation as a sprite sheet: frame size and anchor, mirrored rows, a preview, and every
// format to save in. The choices are kept with the project.
export function openExportSheet(app) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const sheet = openSheet(`Sprite sheet: ${animation.name}`, null, { wide: true });
  const slot = node('div', { style: { display: 'grid', gap: '12px' } });
  const choice = startingChoice(state);
  const job = { state, animation, choice, close: sheet.close };

  job.change = (patch) => {
    Object.assign(choice, patch);
    state.project.exportSettings = {
      preset: choice.preset,
      includeMirrored: choice.includeMirrored,
      custom: choice.preset === 'custom' ? choice.settings : null,
    };
    app.saver.markStructure();
    drawExport(slot, job);
  };
  job.run = (save) =>
    save(state, { ...choice.settings, includeMirrored: choice.includeMirrored }).then(
      warn,
      (error) => toast(inWords(error, 'The files could not be made. Try again in a moment.')),
    );

  sheet.body.append(slot);
  drawExport(slot, job);
}
