import { currentAnimation, restructure } from './actions.js';
import { chooseFile } from './choose-file.js';
import { openImport } from './import-sheet.js';
import {
  addFrame,
  addFrameAtEnd,
  moveFrame,
  removeFrame,
  removeViewFrame,
} from '../model/frames.js';
import { isFrameHidden, setFrameHidden } from '../model/frame-play.js';
import { copyFrameToViews } from '../model/copy-frame.js';
import { copyOfLayer } from '../model/structure.js';

// What can be done to one frame, from its menu, its empty-frame card or the keyboard. Adding and
// moving change every view; deleting can change one or all; the rest change this view only.

const frameChange = (app, label, change) =>
  restructure(app, label, (draft) => ({ frame: change(currentAnimation(draft)) }));

export function imageIntoFrame(app, direction, index) {
  chooseFile((file) => openImport(app, direction, file, index));
}

// the frame before, copied into this one in this view only, layers and pose: a start for the next
export function startFromPrevious(app, direction, index) {
  restructure(app, `Copy frame ${index} here`, (draft) => {
    const frames = currentAnimation(draft).directions[direction].frames;

    frames[index].layers = frames[index - 1].layers.map(copyOfLayer);
  });
}

export const newFrameAtEnd = (app, direction) =>
  frameChange(app, 'New frame', (animation) =>
    addFrameAtEnd(app.store.state.project, animation, direction),
  );

export const duplicateFrame = (app, index) =>
  frameChange(app, 'Duplicate frame', (animation) =>
    addFrame(app.store.state.project, animation, index, true),
  );

export const moveFrameTo = (app, from, to) =>
  frameChange(app, 'Move frame', (animation) => moveFrame(animation, from, to));

export const deleteFrame = (app, index) =>
  frameChange(app, 'Delete frame', (animation) => removeFrame(animation, index));

export const deleteViewFrame = (app, direction, index) =>
  frameChange(app, 'Delete frame from one view', (animation) =>
    removeViewFrame(animation, direction, index),
  );

export const copyToOtherViews = (app, direction, index) =>
  frameChange(app, 'Copy frame to every view', (animation) => {
    copyFrameToViews(app.store.state.project, animation, direction, index);

    return index;
  });

export const toggleFrameHidden = (app, index) =>
  frameChange(app, 'Hide frame from play', (animation) =>
    setFrameHidden(animation, index, !isFrameHidden(animation, index)),
  );
