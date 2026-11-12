import { currentAnimation, restructure } from './actions.js';
import { chooseFile } from './choose-file.js';
import { openImport } from './import-sheet.js';
import {
  addFrame,
  addFrameAtEnd,
  frameCount,
  moveFrame,
  removeFrame,
  removeViewFrame,
} from '../model/frames.js';
import { hiddenFrames, isFrameHidden, listed, setFrameHidden } from '../model/frame-play.js';
import { viewName } from '../model/kinds.js';
import { copyFrameToViews } from '../model/copy-frame.js';
import { copyOfLayer } from '../model/structure.js';
import { toast } from './dom.js';

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

// One view's later frames move up a place while the others' stay. A frame hidden from play is
// a place in every view, so its mark stays where it was and another of this view's drawings
// now stands under it: said, as the grid alone showed it and the frame "came back" into play.
function saysWhatMoved(app, direction, index) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const { frames } = animation.directions[direction];
  // frames of this view that came after the one deleted, and moved; the others' stayed
  const moved = frames.length > index && frames.length < frameCount(animation);
  const hidden = hiddenFrames(animation).filter((number) => number > index);

  if (moved && hidden.length) {
    const view = viewName(state.project, direction);
    const still = hidden.length > 1 ? `Frames ${listed(hidden)} are` : `Frame ${hidden[0]} is`;

    toast(
      `${view}’s later frames moved up a place. ${still} still hidden from play, in every view.`,
    );
  }
}

export function deleteViewFrame(app, direction, index) {
  frameChange(app, 'Delete frame from one view', (animation) =>
    removeViewFrame(animation, direction, index),
  );
  saysWhatMoved(app, direction, index);
}

// the other views' own frames there are drawn over: it says so, and that undo has them
export function copyToOtherViews(app, direction, index) {
  frameChange(app, 'Copy frame to the other views', (animation) => {
    copyFrameToViews(app.store.state.project, animation, direction, index);

    return index;
  });
  toast(`Frame ${index + 1} copied to the other views. Undo brings back what they had.`);
}

export const toggleFrameHidden = (app, index) =>
  frameChange(app, 'Hide frame from play', (animation) =>
    setFrameHidden(animation, index, !isFrameHidden(animation, index)),
  );
