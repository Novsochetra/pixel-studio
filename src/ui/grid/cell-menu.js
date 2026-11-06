import { currentAnimation } from '../actions.js';
import { openMenu } from '../menu.js';
import { frameCount, hasArt } from '../../model/frames.js';
import { viewName } from '../../model/kinds.js';
import {
  copyToOtherViews,
  deleteFrame,
  duplicateFrame,
  imageIntoFrame,
  moveFrameTo,
  startFromPrevious,
} from '../frame-actions.js';

// the selected frame's actions; moving is also a drag, here for the keyboard and for clarity
export function openCellMenu(app, anchor, direction, index) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const frames = animation.directions[direction].frames;
  const count = frameCount(animation);
  const views = Object.keys(animation.directions).length;
  const previous = index > 0 && hasArt(frames[index - 1]);

  const deleteOptions = { danger: true, disabled: count < 2, title: 'From every view' };
  // entries left out are false; null is a line between groups
  const entries = [
    ['Image into this frame…', () => imageIntoFrame(app, direction, index)],
    previous && [`Start from frame ${index}`, () => startFromPrevious(app, direction, index)],
    ['Duplicate frame', () => duplicateFrame(app, index)],
    views > 1 && [
      `Copy ${viewName(state.project, direction)}'s frame to the other views`,
      () => copyToOtherViews(app, direction, index),
    ],
    null,
    ['Move earlier', () => moveFrameTo(app, index, index - 1), { disabled: index === 0 }],
    ['Move later', () => moveFrameTo(app, index, index + 1), { disabled: index >= count - 1 }],
    null,
    [`Delete frame ${index + 1}`, () => deleteFrame(app, index), deleteOptions],
  ];

  openMenu(
    anchor,
    entries.filter((entry) => entry !== false),
  );
}
