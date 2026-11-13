import { icon, node } from '../dom.js';
import { openMenu } from '../menu.js';
import { openCutSheet } from './cut-sheet.js';
import { drawOn, resetPose, setPart, turnIntoPixels } from './pose-actions.js';

function poseEntries(app, picked) {
  const part = picked
    ? [
        ['Draw on part', () => drawOn(app)],
        [`Reset ${picked.name}`, () => setPart(app, picked, null)],
        null,
      ]
    : [];

  return [
    ...part,
    ['Reset pose', () => resetPose(app)],
    ['Turn into pixels', () => turnIntoPixels(app)],
    null,
    ['Edit the cut…', () => openCutSheet(app)],
  ];
}

// On a phone the Pose bar was 924px of controls, most of it a long scroll from the part picked:
// what changes the whole pose waits in a menu at the bar's end.
export function poseMore(app, picked) {
  return node(
    'button.btn.quiet.icon-only',
    {
      id: 'pose-more',
      'aria-label': 'More for the pose',
      title: 'Draw on the part, reset, turn into pixels, edit the cut',
      onclick: (event) =>
        openMenu(event.currentTarget, poseEntries(app, picked), { align: 'right' }),
    },
    icon('more'),
  );
}
