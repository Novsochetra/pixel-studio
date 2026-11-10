import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { allArtLayers } from './actions.js';
import { recolourLayers } from './body/recolour.js';
import { characterColors } from './character-colours.js';
import { mappingRows } from './swap/swap-mapping.js';
import { swapSaid } from './swap/swap-said.js';
import {
  addPalette,
  paletteChooser,
  previewFigure,
  previewToggle,
  reduceButton,
  showPreview,
  starterPalettes,
} from './swap/swap-parts.js';
import { frameAt } from '../model/project.js';
import { suggestMapping } from '../palette/palette.js';

const NO_PALETTE =
  "Add the palette you want to use: paste its hex codes or open a palette file, pick a starter below, or make one from 8 of the art's own colours.";

function layersFor(state, scope) {
  return scope === 'view'
    ? frameAt(state.project, state.at).layers.filter((layer) => layer.kind !== 'reference')
    : allArtLayers(state);
}

function apply(job, mapping, scope) {
  const layers = layersFor(job.app.store.state, scope);

  const everywhere = scope !== 'view';
  const { changed, flattened } = recolourLayers(job.app, {
    label: 'Swap colours',
    layers,
    mapping,
    everywhere,
  });

  toast(swapSaid({ changed, flattened, everywhere }));
  job.close();
}

// the palette's mapping: each character colour and what it becomes, kept with the project
function mappingFor(job, palette) {
  const { project } = job.app.store.state;
  const colours = characterColors(job.app.store.state);

  project.mappings[job.paletteId] ??= suggestMapping(colours, palette.colors);

  return project.mappings[job.paletteId];
}

function setTarget(mapping, color, target) {
  if (target === undefined) {
    delete mapping[color];
  } else {
    mapping[color] = target;
  }
}

function mappingHeader(job, palette, changed) {
  const { app } = job;
  const suggest = () => {
    const colours = characterColors(app.store.state);

    app.store.state.project.mappings[job.paletteId] = suggestMapping(colours, palette.colors);
    changed();
  };

  return node(
    'div.compare',
    {},
    node('label.field', {}, node('span', {}, 'Change to this palette'), paletteChooser(job)),
    node(
      'div.field',
      {},
      node('span', {}, 'Each colour goes to the one you pick; Keep leaves it'),
      node(
        'div.group',
        {},
        node('button.btn', { onclick: suggest }, 'Suggest nearest'),
        reduceButton(job),
      ),
    ),
  );
}

function applyButtons(job, mapping) {
  return node(
    'div.sheet-actions',
    {},
    node('button.btn', { onclick: job.close }, 'Cancel'),
    node('button.btn', { onclick: () => apply(job, mapping, 'view') }, 'Apply to this frame'),
    node(
      'button.btn.primary',
      { onclick: () => apply(job, mapping, 'all') },
      'Apply to the whole character',
    ),
  );
}

function drawMapping(job, palette) {
  const { app } = job;
  const mapping = mappingFor(job, palette);
  const changed = () => {
    app.saver.markStructure();
    job.draw();
  };
  const onChange = (color, target) => {
    setTarget(mapping, color, target);
    changed();
  };
  const rows = mappingRows(app.store.state, palette, mapping, onChange);

  replace(
    job.slot,
    mappingHeader(job, palette, changed),
    node('div.compare', {}, node('div.map-table', {}, rows), previewFigure(app, mapping)),
    previewToggle(job, mapping),
    node(
      'details',
      {},
      node('summary', {}, 'Add another palette'),
      addPalette(job),
      starterPalettes(job),
    ),
    applyButtons(job, mapping),
  );
  showPreview(job, mapping);
}

// Every character colour changed to one of a palette's, shown before it is applied to a frame or
// to the whole character.
export function openSwapSheet(app) {
  const sheet = openSheet('Swap colours', () => app.store.set({ swapPreview: null }), {
    wide: true,
  });
  const slot = node('div', { style: { display: 'grid', gap: '12px' } });
  const { palettes } = app.store.state.project;
  const job = {
    app,
    slot,
    close: sheet.close,
    paletteId: palettes.at(-1)?.id ?? null,
    previewOn: true,
  };

  job.draw = () => {
    const palette = app.store.state.project.palettes.find(
      (candidate) => candidate.id === job.paletteId,
    );

    if (palette) {
      drawMapping(job, palette);

      return;
    }

    replace(
      slot,
      node('p.hint', {}, NO_PALETTE),
      addPalette(job),
      starterPalettes(job),
      reduceButton(job),
    );
    app.store.set({ swapPreview: null });
  };

  sheet.body.append(slot);
  job.draw();
}
