import { commit, currentAnimation, restructure } from './actions.js';
import { chooseFile } from './choose-file.js';
import { openImport } from './import-sheet.js';
import { addFrame, moveFrame, removeFrame } from '../model/frames.js';
import { copyFrameToViews } from '../model/structure.js';
import { cloneSprite } from '../model/sprite.js';
import { matchingLayer } from '../model/project.js';

// What can be done to one frame, from its menu, its empty-frame card or the keyboard. Adding,
// moving and deleting change every view; the rest change this view only.

const frameChange = (app, label, change) =>
  restructure(app, label, (draft) => ({ frame: change(currentAnimation(draft)) }));

export function imageIntoFrame(app, direction, index) {
  chooseFile((file) => openImport(app, direction, file, index));
}

// the frame before, copied into this one in this view only: a start for the next pose
export function startFromPrevious(app, direction, index) {
  const frames = currentAnimation(app.store.state).directions[direction].frames;
  const [previous, frame] = [frames[index - 1], frames[index]];

  commit(app, `Copy frame ${index} here`, frame.layers, () => {
    for (const layer of frame.layers) {
      const source = matchingLayer(previous, layer)?.sprite;

      if (source) {
        layer.sprite = cloneSprite(source);
      }
    }
  });
}

export const newFrameAfter = (app, index) =>
  frameChange(app, 'New frame', (animation) => addFrame(app.store.state.project, animation, index));

export const duplicateFrame = (app, index) =>
  frameChange(app, 'Duplicate frame', (animation) =>
    addFrame(app.store.state.project, animation, index, true),
  );

export const moveFrameTo = (app, from, to) =>
  frameChange(app, 'Move frame', (animation) => moveFrame(animation, from, to));

export const deleteFrame = (app, index) =>
  frameChange(app, 'Delete frame', (animation) => removeFrame(animation, index));

export const copyToOtherViews = (app, direction, index) =>
  frameChange(app, 'Copy frame to every view', (animation) => {
    copyFrameToViews(app.store.state.project, animation, direction, index);

    return index;
  });
