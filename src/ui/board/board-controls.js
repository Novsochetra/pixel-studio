import { node } from '../dom.js';
import { directionsInUse } from '../actions.js';
import { changeMarkup } from './board-marks.js';
import { guideChips } from '../guide-chips.js';
import { viewName } from '../../model/kinds.js';
import { slider } from '../slider.js';

const CLICKS = [
  ['edit', 'Opens the view'],
  ['pen', 'Draws a mark'],
  ['note', 'Adds a note'],
  ['rub', 'Rubs one out'],
];

function overlayControls(app) {
  const { state } = app.store;
  const setOverlay = (patch) => app.store.set({ overlay: { ...state.overlay, ...patch } });
  const views = directionsInUse(state).map((direction) =>
    node(
      'option',
      { value: direction, selected: state.overlay.direction === direction },
      viewName(state.project, direction),
    ),
  );

  return node(
    'div.group.board-row',
    {},
    node(
      'label.group',
      { for: 'overlay-direction', style: { gap: '6px' } },
      'See-through overlay',
      node(
        'select.input',
        {
          id: 'overlay-direction',
          onchange: (event) => setOverlay({ direction: event.target.value || null }),
        },
        node('option', { value: '' }, 'None'),
        views,
      ),
    ),
    slider({
      min: '0.1',
      max: '0.9',
      step: '0.05',
      value: String(state.overlay.opacity),
      'aria-label': 'Overlay strength',
      id: 'overlay-opacity',
      onchange: (event) => setOverlay({ opacity: Number(event.target.value) }),
    }),
  );
}

function markControls(app, note) {
  const { state } = app.store;
  const mode = state.markupMode ?? 'edit';
  const clearMarks = () =>
    changeMarkup(app, 'Clear marks', (markup) => {
      markup.strokes = [];
      markup.notes = [];
    });

  return node(
    'div.group.board-row',
    {},
    node(
      'div.segmented',
      { role: 'group', 'aria-label': 'A click on the board' },
      CLICKS.map(([id, label]) =>
        node(
          'button',
          { 'aria-pressed': String(mode === id), onclick: () => app.store.set({ markupMode: id }) },
          label,
        ),
      ),
    ),
    mode === 'note' ? note : null,
    node('button.btn.quiet', { onclick: clearMarks }, 'Clear marks'),
  );
}

// what the board shows and what a click on it does
export function boardControls(app, note) {
  return node('div.board-controls', {}, overlayControls(app), markControls(app, note));
}

// for each guide that checks the art, how far off each view is
export function guideSummary(state) {
  const lines = state.project.guides
    .filter((guide) => guide.rule !== 'fixed')
    .map((guide) =>
      node('div.guide-checks', {}, node('span.chip', {}, guide.name), guideChips(state, guide)),
    );

  return node('div.board-guides', {}, lines);
}
