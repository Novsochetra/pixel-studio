import { node } from '../dom.js';
import { boardPreview } from '../board-canvas.js';
import { paletteForm } from '../palette-form.js';
import { makeReducedPalette } from './swap-mapping.js';

// The pieces of the swap sheet; job: { app, paletteId, previewOn, draw, close }.

// every view with the swap applied, inside the sheet, since the sheet covers the canvas
export function previewFigure(app, mapping) {
  return node(
    'figure',
    { style: { margin: '0', display: 'grid', gap: '6px' } },
    boardPreview(app.store.state, 420, { overlay: null, mapping, onScreen: true }),
    node('figcaption.hint', {}, 'With the swap applied'),
  );
}

export const showPreview = (job, mapping) =>
  job.app.store.set({ swapPreview: job.previewOn ? mapping : null });

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

export function addPalette(job) {
  return paletteForm((added) => {
    job.app.store.state.project.palettes.push(added);
    job.paletteId = added.id;
    job.app.saver.markStructure();
    job.draw();
  });
}

export function reduceButton(job) {
  const reduce = () => {
    job.paletteId = makeReducedPalette(job.app, 8)?.id ?? job.paletteId;
    job.draw();
  };

  return node('button.btn', { onclick: reduce }, 'Make an 8-colour palette from the art');
}

export function previewToggle(job, mapping) {
  const change = (event) => {
    job.previewOn = event.target.checked;
    showPreview(job, mapping);
  };

  return node(
    'label.toggle-row',
    { for: 'swap-preview' },
    node('span', {}, 'Also preview on the canvas behind'),
    node('input.switch', {
      type: 'checkbox',
      role: 'switch',
      id: 'swap-preview',
      checked: job.previewOn,
      onchange: change,
    }),
  );
}
