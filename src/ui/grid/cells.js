import { icon, node } from '../dom.js';
import { drawThumbnail } from '../thumbnail.js';
import { openCellMenu } from './cell-menu.js';
import { moveFrameTo } from '../frame-actions.js';
import { bounds } from '../../model/sprite.js';
import { viewName } from '../../model/kinds.js';

const THUMB = 52;

const select = (app, direction, index) =>
  app.store.set({ at: { ...app.store.state.at, direction, frame: index }, selection: null });

// Enter opens the selected frame's menu (or selects it); Alt+← and Alt+→ move the frame
function onCellKey(app, event, place) {
  const { direction, index, selected } = place;
  const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];

  if (event.altKey && step) {
    event.preventDefault();
    event.stopPropagation();
    moveFrameTo(app, index, index + step);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopPropagation();
    selected
      ? openCellMenu(app, event.currentTarget, direction, index)
      : select(app, direction, index);
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

// one picture of the animation: a view at a frame. place: { direction, index, sprite, box,
// selected, playing }
export function cell(app, place) {
  const empty = !bounds(place.sprite);
  const name = viewName(app.store.state.project, place.direction);
  const thumb = node('canvas', { 'aria-hidden': 'true' });
  drawThumbnail(thumb, place.sprite, THUMB, { box: place.box });
  const classes = `${empty ? '.empty' : ''}${place.selected ? '.selected' : ''}${place.playing ? '.playing' : ''}`;

  return node(
    `div.cell${classes}`,
    {
      role: 'gridcell',
      tabindex: place.selected ? '0' : '-1',
      'aria-selected': String(place.selected),
      'aria-label': `${name}, frame ${place.index + 1}${empty ? ', empty' : ''}`,
      title: place.selected
        ? 'Click for its actions, or drag to move it'
        : `Frame ${place.index + 1}`,
      onclick: (event) =>
        place.selected
          ? openCellMenu(app, event.currentTarget, place.direction, place.index)
          : select(app, place.direction, place.index),
      onkeydown: (event) => onCellKey(app, event, place),
    },
    thumb,
    place.selected ? moreButton(app, place) : null,
  );
}

// a frame of a side the game mirrors: shown flipped and faded, as the game will draw it
export function mirrorCell(sprite, box) {
  const thumb = node('canvas', { 'aria-hidden': 'true' });
  drawThumbnail(thumb, sprite, THUMB, { box, flip: true });

  return node(
    `div.cell.mirror${bounds(sprite) ? '' : '.empty'}`,
    { role: 'gridcell', 'aria-hidden': 'true' },
    thumb,
  );
}
