import { node, icon, replace } from './dom.js';
import { commit, currentAnimation, hiddenArt } from './actions.js';
import { frameAt, directionLabel } from '../model/project.js';
import { cloneSprite } from '../model/sprite.js';
import { chooseFile } from './views-panel.js';
import { openImport } from './import-sheet.js';

const drawn = (layer) =>
  layer.kind !== 'reference' && layer.sprite?.pixels.some((value, i) => i % 4 === 3 && value);

// the frame before, copied into this one in this view only: a start for the next pose
function copyPrevious(app, frame, previous, index) {
  commit(app, `Copy frame ${index} here`, frame.layers, () => {
    for (const layer of frame.layers) {
      const source = previous.layers.find((other) => other.key === layer.key)?.sprite;

      if (source) {
        layer.sprite = cloneSprite(source);
      }
    }
  });
}

// Over an empty frame: what to do with it, so a new frame never looks like a dead end.
export function renderEmptyFrame(el, app) {
  const { state } = app.store;
  const frame = frameAt(state.project, state.at);
  const empty = frame && !frame.layers.some(drawn) && !hiddenArt(state, state.at.direction).length;
  el.hidden = !empty || state.mode !== 'edit';

  if (el.hidden) {
    return;
  }

  const index = state.at.frame;
  const direction = state.at.direction;
  const frames = currentAnimation(state).directions[direction].frames;
  const previous = index > 0 ? frames[index - 1] : null;
  const name =
    frames.length > 1
      ? `Frame ${index + 1} of ${directionLabel(direction)}`
      : directionLabel(direction);

  replace(
    el,
    node(
      'div',
      {},
      node('strong', {}, `${name} is empty`),
      node('div.hint', {}, 'Drop a ChatGPT image on the canvas, or draw on it.'),
    ),
    node(
      'button.btn.primary',
      { onclick: () => chooseFile((file) => openImport(app, direction, file, index)) },
      icon('upload'),
      'Image into this frame…',
    ),
    previous?.layers.some(drawn)
      ? node(
          'button.btn',
          { onclick: () => copyPrevious(app, frame, previous, index) },
          `Start from frame ${index}`,
        )
      : null,
  );
}
