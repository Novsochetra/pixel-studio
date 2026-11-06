import { node } from '../dom.js';
import { currentAnimation } from '../actions.js';
import { mirrorCell } from './cells.js';
import { compositeFrame } from '../../model/composite.js';
import { bounds, unionBounds } from '../../model/sprite.js';
import { flippedSides } from '../../model/directions.js';
import { viewName } from '../../model/kinds.js';

// one framing for a whole row, so the thumbnails show the art moving, not jumping to fit
export function rowArt(project, frames) {
  const sprites = frames.map((frame) =>
    compositeFrame(frame, project.canvas.width, project.canvas.height),
  );

  return { sprites, box: unionBounds(sprites.map(bounds)) };
}

function mirrorRow(state, direction, source) {
  const frames = currentAnimation(state).directions[source].frames;
  const { sprites, box } = rowArt(state.project, frames);
  const name = viewName(state.project, direction);

  return node(
    'div.grid-row.mirrored',
    { role: 'row', title: `The game flips ${viewName(state.project, source)} for this side` },
    node(
      'div.grid-label',
      { role: 'rowheader' },
      node('span.grid-view', {}, name),
      node('small', {}, 'mirrored'),
    ),
    node(
      'div.grid-cells',
      {},
      sprites.map((sprite) => mirrorCell(sprite, box)),
    ),
  );
}

export function mirrorRows(state) {
  return flippedSides(state.project, currentAnimation(state)).map(([side, source]) =>
    mirrorRow(state, side, source),
  );
}
