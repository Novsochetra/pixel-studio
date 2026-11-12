import { node } from '../dom.js';
import { changeStructure } from '../actions.js';
import { viewsToFit } from '../views-side-by-side.js';
import { paletteForm } from '../palette-form.js';
import { makeReducedPalette } from './swap-mapping.js';
import { paletteFromHexCodes } from '../../palette/palette.js';
import { STARTER_PALETTES } from '../../art/starter-palettes.js';
import { addPaletteStep } from '../palette-step.js';

// The pieces of the swap sheet; job: { app, paletteId, previewOn, draw, close }.

// every view with the swap applied, inside the sheet, since the sheet covers the canvas
export function previewFigure(app, mapping) {
  return node(
    'figure',
    {},
    viewsToFit(app.store.state, 420, { mapping, onScreen: true }),
    node('figcaption.hint', {}, 'With the swap applied'),
  );
}

// The canvas behind the window wears the swap too, as far as it shows round the window. It had
// a switch, which did nothing to be seen on a phone, where the window covers the canvas.
export const showPreview = (job, mapping) => job.app.store.set({ swapPreview: mapping });

export function paletteChooser(job) {
  const { palettes } = job.app.store.state.project;
  const pick = (event) => {
    job.paletteId = event.target.value;
    job.draw();
  };

  return node(
    'select.input',
    { id: 'swap-palette', 'aria-label': 'Target palette', onchange: pick },
    palettes.map((candidate) =>
      node(
        'option',
        { value: candidate.id, selected: candidate.id === job.paletteId },
        `${candidate.name} (${candidate.colors.length})`,
      ),
    ),
  );
}

// The palette picked, with the way to take it off the project: a palette added by mistake, or
// tried and not wanted, stayed on the list for good.
export function paletteRow(job) {
  const { app } = job;
  const remove = () => {
    const { project } = app.store.state;
    const before = structuredClone(project.palettes);

    project.palettes = project.palettes.filter((palette) => palette.id !== job.paletteId);
    app.history.recordSetting(
      'Remove palette',
      'palettes',
      before,
      structuredClone(project.palettes),
    );
    job.paletteId = project.palettes.at(-1)?.id ?? null;
    changeStructure(app, 'palettes');
    // with the keys they go to the list, which shows the palette now picked: left on Remove, a
    // second Enter took that one off too
    showAdded(job);
  };

  return node(
    'div.group',
    { style: { gap: '6px' } },
    paletteChooser(job),
    node(
      'button.btn.quiet',
      { title: 'Take this palette off the project (undo brings it back)', onclick: remove },
      'Remove',
    ),
  );
}

// A palette just added is the one picked: with the keys in use they go to the list that says
// so. The button that added it is gone or folded away, and they fell to Apply to all, where a
// second Enter recoloured every frame.
function showAdded(job) {
  const byKeys = Boolean(document.activeElement?.matches?.(':focus-visible'));

  job.draw();

  if (byKeys) {
    document.getElementById('swap-palette')?.focus();
  }
}

export function addPalette(job) {
  return paletteForm((added) => {
    addPaletteStep(job.app, added);
    job.paletteId = added.id;
    showAdded(job);
  });
}

// a ready-made palette to start from, added to the project as a copy the person can change
export function starterPalettes(job) {
  const add = (starter) => {
    const palette = paletteFromHexCodes(starter.name, starter.colors);
    addPaletteStep(job.app, palette);
    job.paletteId = palette.id;
    showAdded(job);
  };

  return node(
    'div.field',
    {},
    node('span', {}, 'Or start from one of these'),
    node(
      'div.start-sizes',
      { role: 'group', 'aria-label': 'Starter palettes' },
      STARTER_PALETTES.map((starter) =>
        node('button.btn.chip', { type: 'button', onclick: () => add(starter) }, starter.name),
      ),
    ),
  );
}

export function reduceButton(job) {
  const reduce = () => {
    job.paletteId = makeReducedPalette(job.app, 8)?.id ?? job.paletteId;
    showAdded(job);
  };

  const name = 'Make an 8-colour palette from the art';

  return node('button.btn', { title: name, 'aria-label': name, onclick: reduce }, 'From the art');
}
