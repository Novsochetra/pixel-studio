import { currentAnimation } from '../actions.js';
import { openMenu } from '../menu.js';
import { frameCount, hasArt } from '../../model/frames.js';
import { isFrameHidden } from '../../model/frame-play.js';
import { viewName } from '../../model/kinds.js';
import {
  copyToOtherViews,
  deleteFrame,
  deleteViewFrame,
  duplicateFrame,
  imageIntoFrame,
  moveFrameTo,
  startFromPrevious,
  toggleFrameHidden,
} from '../frame-actions.js';

// a project of one view has one way to delete, so its menu needs no word on which
function deleteEntries(app, { direction, index, frames, count, viewCount }) {
  const name = viewName(app.store.state.project, direction);
  const fromThisView = [
    viewCount > 1 ? `Delete frame ${index + 1} from ${name}` : `Delete frame ${index + 1}`,
    () => deleteViewFrame(app, direction, index),
    {
      danger: true,
      disabled: frames.length < 2,
      title: frames.length < 2 ? 'A view keeps its last frame' : 'The other views keep theirs',
    },
  ];
  const fromEveryView = [
    `Delete frame ${index + 1} from every view`,
    () => deleteFrame(app, index),
    { danger: true, disabled: count < 2 },
  ];

  return viewCount > 1 ? [fromThisView, fromEveryView] : [fromThisView];
}

// the selected frame's actions; moving is also a drag, here for the keyboard and for clarity
export function openCellMenu(app, anchor, direction, index) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const frames = animation.directions[direction].frames;
  const count = frameCount(animation);
  const viewCount = Object.keys(animation.directions).length;
  const previous = index > 0 && hasArt(frames[index - 1]);

  // entries left out are false; null is a line between groups
  const entries = [
    ['Image into this frame…', () => imageIntoFrame(app, direction, index)],
    previous && [`Start from frame ${index}`, () => startFromPrevious(app, direction, index)],
    ['Duplicate frame', () => duplicateFrame(app, index)],
    viewCount > 1 && [
      `Copy ${viewName(state.project, direction)}'s frame to the other views`,
      () => copyToOtherViews(app, direction, index),
    ],
    [
      isFrameHidden(animation, index) ? 'Show in play' : 'Hide from play',
      () => toggleFrameHidden(app, index),
      { title: 'Play skips a hidden frame; it stays in every view and every download' },
    ],
    null,
    ['Move earlier', () => moveFrameTo(app, index, index - 1), { disabled: index === 0 }],
    [
      'Move later',
      () => moveFrameTo(app, index, index + 1),
      { disabled: index >= frames.length - 1 },
    ],
    null,
    ...deleteEntries(app, { direction, index, frames, count, viewCount }),
  ];

  openMenu(
    anchor,
    entries.filter((entry) => entry !== false),
  );
}
