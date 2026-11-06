import { icon, node } from '../dom.js';
import { goTo } from '../actions.js';
import { drawThumbnail } from '../thumbnail.js';
import { openCellMenu } from './cell-menu.js';
import { moveFrameTo, toggleFrameHidden } from '../frame-actions.js';
import { bounds } from '../../model/sprite.js';
import { viewName } from '../../model/kinds.js';

const THUMB_SIZE = 52;

const selectCell = (app, direction, index) => goTo(app, { direction, frame: index });

const ACROSS = { ArrowLeft: -1, ArrowRight: 1 };
const DOWN = { ArrowUp: -1, ArrowDown: 1 };

function cellAfterKey(event, { direction, index }) {
  const row = event.currentTarget.closest('.grid-row');
  const count = row.querySelectorAll('.cell:not(.mirror)').length;
  const along = { Home: 0, End: count - 1 }[event.key] ?? index + (ACROSS[event.key] ?? 0);

  if (!(event.key in DOWN)) {
    return { direction, index: Math.max(0, Math.min(count - 1, along)) };
  }

  const rows = [...row.parentElement.querySelectorAll(':scope > .grid-row[data-direction]')];
  const next = rows[rows.indexOf(row) + DOWN[event.key]];

  return next ? { direction: next.dataset.direction, index } : null;
}

const MOVES_FOCUS = new Set([...Object.keys(ACROSS), ...Object.keys(DOWN), 'Home', 'End']);

function onCellKey(app, event, place) {
  const { direction, index, selected } = place;
  const step = ACROSS[event.key];

  if (event.altKey && step) {
    event.preventDefault();
    event.stopPropagation();
    moveFrameTo(app, index, index + step);
  } else if (MOVES_FOCUS.has(event.key) && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    event.stopPropagation();
    const to = cellAfterKey(event, place);

    if (to) {
      selectCell(app, to.direction, to.index);
    }
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopPropagation();
    selected
      ? openCellMenu(app, event.currentTarget, direction, index)
      : selectCell(app, direction, index);
  }
}

function moreButton(app, place) {
  return node(
    'button.cell-more',
    {
      'aria-label': `Frame ${place.index + 1} actions`,
      title: 'Upload, duplicate, copy, move or delete',
      tabindex: '-1',
      onclick: (event) => {
        event.stopPropagation();
        openCellMenu(app, event.currentTarget, place.direction, place.index);
      },
    },
    icon('more'),
  );
}

function hiddenMark(app, place) {
  return node(
    'button.cell-hidden',
    {
      'aria-label': `Unhide frame ${place.index + 1}`,
      title: 'Hidden from play: click to unhide it',
      tabindex: '-1',
      onclick: (event) => {
        event.stopPropagation();
        toggleFrameHidden(app, place.index);
      },
    },
    icon('eye-off'),
  );
}

const cellClasses = (place, empty) =>
  [
    empty && '.empty',
    place.selected && '.selected',
    place.playing && '.playing',
    place.hidden && '.hidden-frame',
  ]
    .filter(Boolean)
    .join('');

const cellName = (name, place, empty) =>
  `${name}, frame ${place.index + 1}${empty ? ', empty' : ''}${place.hidden ? ', hidden from play' : ''}`;

export function cell(app, place) {
  const empty = !bounds(place.sprite);
  const name = viewName(app.store.state.project, place.direction);
  const thumb = node('canvas', { 'aria-hidden': 'true' });

  drawThumbnail(thumb, place.sprite, THUMB_SIZE, { box: place.box });

  return node(
    `div.cell${cellClasses(place, empty)}`,
    {
      role: 'gridcell',
      tabindex: place.selected ? '0' : '-1',
      'aria-selected': String(place.selected),
      'aria-label': cellName(name, place, empty),
      title: place.selected
        ? 'Click for its actions, or drag to move it'
        : `Frame ${place.index + 1}`,
      onclick: (event) =>
        place.selected
          ? openCellMenu(app, event.currentTarget, place.direction, place.index)
          : selectCell(app, place.direction, place.index),
      onkeydown: (event) => onCellKey(app, event, place),
    },
    thumb,
    place.selected ? moreButton(app, place) : null,
    place.hidden ? hiddenMark(app, place) : null,
  );
}

// a frame of a side the game mirrors: shown flipped and faded, as the game will draw it
export function mirrorCell(sprite, box) {
  const thumb = node('canvas', { 'aria-hidden': 'true' });

  drawThumbnail(thumb, sprite, THUMB_SIZE, { box, flip: true });

  return node(
    `div.cell.mirror${bounds(sprite) ? '' : '.empty'}`,
    { role: 'gridcell', 'aria-hidden': 'true' },
    thumb,
  );
}
