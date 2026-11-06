import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { allArtLayers, commit } from './actions.js';
import { boardPreview } from './board-canvas.js';
import { partsEditor } from './parts-editor.js';
import { keepVersion } from './versions-sheet.js';
import { downloadOutfit, keepAsSwap } from './outfit-files.js';
import { choiceControls, chosenName, chosenRamps } from './outfits/outfit-choice.js';
import { outfitNames } from './outfits/outfit-names.js';
import { kitMapping } from '../palette/kits.js';
import { applyMapping } from '../palette/palette.js';
import { gameOf } from '../model/presets.js';

// the whole character in the outfit, kept as a version first so it can come off
function wear(job, mapping, name) {
  const { app } = job;

  keepVersion(app, `Before ${name}`);
  const layers = allArtLayers(app.store.state);
  commit(app, name, layers, () =>
    layers.forEach((layer) => {
      layer.sprite = applyMapping(layer.sprite, mapping);
    }),
  );
  toast(`${name} on the whole character. Undo takes it off.`);
  job.close();
}

function actions(job, mapping, name) {
  const { app } = job;
  const nothing = !Object.keys(mapping).length;
  const why = nothing ? 'Tick which colours make up each part first, below' : undefined;
  const download = () =>
    downloadOutfit(app.store.state, mapping, name).catch((error) => toast(error.message));

  return node(
    'div.sheet-actions',
    {},
    node('button.btn', { onclick: job.close }, 'Close'),
    node(
      'button.btn',
      { disabled: nothing, title: why, onclick: () => keepAsSwap(app, mapping, name) },
      'Keep as a colour swap',
    ),
    node('button.btn', { onclick: download }, 'Download it'),
    node(
      'button.btn.primary',
      { disabled: nothing, title: why, onclick: () => wear(job, mapping, name) },
      'Wear it (whole character)',
    ),
  );
}

function partsSection(job) {
  const remember = (event) => {
    job.partsOpen = event.currentTarget.open;
  };

  return node(
    'details',
    { open: job.partsOpen, ontoggle: remember },
    node('summary', {}, 'Which colours are which part'),
    partsEditor(job.app, job.draw),
    outfitNames(job.app, job.draw),
  );
}

function drawOutfits(job) {
  const { app, choice } = job;
  const { state } = app.store;

  // a saved outfit that was removed falls back to picking colours
  if (
    choice.source === 'outfit' &&
    !state.project.outfits.some((outfit) => outfit.id === choice.outfit)
  ) {
    choice.source = 'custom';
  }

  const mapping = kitMapping(state.project.parts, chosenRamps(state.project, choice));
  const name = chosenName(state.project, choice);
  const change = (patch) => {
    Object.assign(choice, patch);
    job.draw();
  };

  replace(
    job.slot,
    choiceControls(app, choice, change),
    node(
      'div',
      { style: { overflowX: 'auto' } },
      boardPreview(state, 860, { overlay: null, mapping, onScreen: true }),
    ),
    Object.keys(mapping).length
      ? null
      : node('p.hint', {}, 'Nothing changes yet: tick which colours make up each part below.'),
    partsSection(job),
    actions(job, mapping, name),
  );
}

// The character in another outfit: a Naga Eleven team's kit, a saved outfit, or colours picked
// for each part, worn, kept as a colour swap or downloaded.
export function openOutfitsSheet(app) {
  const { project } = app.store.state;
  const teams = gameOf(project).teamKits;
  const sheet = openSheet(teams ? 'Team kits and outfits' : 'Outfits', null, { wide: true });
  const slot = node('div', { style: { display: 'grid', gap: '14px' } });
  const choice = {
    source: teams ? 'team' : 'custom',
    team: 'cambodia',
    kit: 'home',
    outfit: null,
    custom: {},
  };
  const job = {
    app,
    slot,
    choice,
    close: sheet.close,
    partsOpen: !project.parts.some((part) => part.colours.length),
  };

  job.draw = () => drawOutfits(job);

  sheet.body.append(slot);
  job.draw();
}
