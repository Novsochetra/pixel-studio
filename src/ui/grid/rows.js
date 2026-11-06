import { icon, node } from '../dom.js';
import { currentAnimation, selectDirection } from '../actions.js';
import { bindFrameDrag } from '../frame-drag.js';
import { moveFrameTo, newFrameAfter } from '../frame-actions.js';
import { cell } from './cells.js';
import { mirrorRows, rowArt } from './row-art.js';
import { openAddViewMenu, openViewMenu } from './view-menu.js';
import { drawnDirections, missingDirections } from '../../model/directions.js';
import { referenceOf } from '../../model/reference.js';
import { isSingleView, viewName } from '../../model/kinds.js';

function label(app, direction) {
  const { state } = app.store;
  const name = viewName(state.project, direction);
  const star = referenceOf(state.project) === direction;

  return node(
    'div.grid-label',
    { role: 'rowheader' },
    node(
      'button.grid-view',
      { onclick: () => selectDirection(app, direction), title: `Edit ${name}` },
      name,
    ),
    star ? node('span.grid-star', { title: 'Every other view is matched to this one' }, '★') : null,
    node(
      'button.btn.quiet.grid-view-more',
      {
        'aria-label': `${name} view actions`,
        onclick: (event) => openViewMenu(app, event.currentTarget, direction),
      },
      icon('more'),
    ),
  );
}

// a row of a grid holds cells only, so the button sits in a cell of its own
function addFrameTile(app, last) {
  return node(
    'div.cell-slot',
    { role: 'gridcell' },
    node(
      'button.cell-add',
      {
        'aria-label': 'New frame at the end',
        title: 'New frame at the end, in every view',
        onclick: () => newFrameAfter(app, last),
      },
      icon('plus'),
    ),
  );
}

function viewRow(app, direction, playFrame) {
  const { state } = app.store;
  const frames = currentAnimation(state).directions[direction].frames;
  const { sprites, box } = rowArt(state.project, frames);
  const current = direction === state.at.direction;
  const cells = node(
    'div.grid-cells',
    {},
    sprites.map((sprite, index) =>
      cell(app, {
        direction,
        index,
        sprite,
        box,
        selected: current && index === state.at.frame,
        playing: index === playFrame,
      }),
    ),
    current ? addFrameTile(app, frames.length - 1) : null,
  );
  bindFrameDrag(cells, '.cell', (from, to) => moveFrameTo(app, from, to));
  const single = isSingleView(state.project);

  return node(
    `div.grid-row${current ? '.current' : ''}`,
    { role: 'row', 'data-direction': direction },
    single ? null : label(app, direction),
    cells,
  );
}

function numbersRow(state, count, playFrame) {
  const numbers = Array.from({ length: count }, (_, index) => {
    const on = `${index === state.at.frame ? '.on' : ''}${index === playFrame ? '.playing' : ''}`;

    return node(`span.grid-number${on}`, {}, String(index + 1));
  });

  return node(
    'div.grid-row.grid-numbers',
    { 'aria-hidden': 'true' },
    isSingleView(state.project) ? null : node('div.grid-label'),
    node('div.grid-cells', {}, numbers),
  );
}

export function gridBody(app, { all, playFrame }) {
  const { state } = app.store;
  const rows = all ? drawnDirections(currentAnimation(state)) : [state.at.direction];
  const canAdd =
    all &&
    !isSingleView(state.project) &&
    missingDirections(state.project, currentAnimation(state)).length > 0;
  const gridName = all
    ? 'Frames of every view'
    : `Frames of ${viewName(state.project, state.at.direction)}`;

  return node(
    'div.grid-scroll',
    {},
    node(
      'div.grid-table',
      { role: 'grid', 'aria-label': gridName },
      numbersRow(
        state,
        currentAnimation(state).directions[state.at.direction].frames.length,
        playFrame,
      ),
      rows.map((direction) => viewRow(app, direction, playFrame)),
      all ? mirrorRows(state) : null,
    ),
    // a grid holds rows of cells only, so the button that adds a row sits under it
    canAdd
      ? node(
          'button.btn.quiet.grid-add-view',
          { onclick: (event) => openAddViewMenu(app, event.currentTarget) },
          icon('plus'),
          'Add a view',
        )
      : null,
  );
}
