import { node } from '../dom.js';
import { currentAnimation } from '../actions.js';
import { mirrorCell } from './cells.js';
import { compositeFrame } from '../../model/composite.js';
import { bounds } from '../../model/sprite.js';
import { mirrorsOf } from '../../model/directions.js';
import { viewName } from '../../model/kinds.js';

// one framing for a whole row, so the thumbnails show the art moving, not jumping to fit
function unionBox(sprites) {
  const boxes = sprites.map(bounds).filter(Boolean);

  if (!boxes.length) {
    return null;
  }

  return {
    left: Math.min(...boxes.map((box) => box.left)),
    top: Math.min(...boxes.map((box) => box.top)),
    right: Math.max(...boxes.map((box) => box.right)),
    bottom: Math.max(...boxes.map((box) => box.bottom)),
  };
}

// a row's frames as they ship, and the one box that frames them all
export function rowArt(project, frames) {
  const sprites = frames.map((frame) =>
    compositeFrame(frame, project.canvas.width, project.canvas.height),
  );

  return { sprites, box: unionBox(sprites) };
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

// the sides the game mirrors from a view this animation draws, and which view each comes from
function mirroredSides(state) {
  const directions = currentAnimation(state).directions;

  return Object.entries(mirrorsOf(state.project)).filter(
    ([side, source]) => directions[source] && !directions[side],
  );
}

// the sides the game draws by flipping another, faded: what the sheet will hold
export function mirrorRows(state) {
  return mirroredSides(state).map(([side, source]) => mirrorRow(state, side, source));
}
