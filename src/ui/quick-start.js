import { node } from './dom.js';
import { openShortcuts } from './shortcuts.js';
import { keepSetting, readSetting } from './remembered.js';
import { hasKeyboard, keyNames } from './platform-keys.js';
import { isSingleView } from '../model/kinds.js';

const SEEN = 'pixel-clean-quick-start';

const seen = () => Boolean(readSetting(SEEN, false));

const remember = () => keepSetting(SEEN, true);

const CLEAN = {
  keys: 'drop an AI image on the canvas, or into a frame below it.',
  fingers:
    'tap Panels (the sliders, at the foot), then Frames, and put an AI image into a frame from its ⋯ menu.',
  // a tablet held wide has the frames under its canvas: there is no round button to tap
  tablet: 'put an AI image into a frame under the canvas, from its ⋯ menu.',
};

const WITH_FINGERS =
  'draw with one finger, pinch with two to zoom and move. A tap with two fingers undoes a step.';

const FIX = {
  keys: keyNames('touch up pixels with the pencil (B) and eraser (E). ⌘Z undoes your steps.'),
  fingers: WITH_FINGERS,
  tablet: WITH_FINGERS,
};

function handsNow() {
  if (hasKeyboard()) {
    return 'keys';
  }

  return document.documentElement.dataset.layout === 'compact' ? 'fingers' : 'tablet';
}

const steps = (project, hands) => [
  [
    'Clean: ',
    `${CLEAN[hands]} ${isSingleView(project) ? 'Every frame' : 'Every view and frame'} is fitted to the first: same pixel size, place and colours.`,
  ],
  ['Fix: ', FIX[hands]],
  [
    'Use: ',
    'Download gives PNGs at the art’s own size and a big copy, sprite sheets and GIFs for your game.',
  ],
];

const cardOf = (project, gotIt) =>
  node(
    'div.quick-start',
    { role: 'dialog', 'aria-label': 'Quick start' },
    node('h3', {}, 'Three steps'),
    node(
      'ol',
      {},
      steps(project, handsNow()).map(([title, text]) => node('li', {}, node('b', {}, title), text)),
    ),
    node(
      'div.group',
      { style: { gap: '6px' } },
      gotIt,
      hasKeyboard()
        ? node('button.btn.quiet', { onclick: () => openShortcuts(project) }, 'Shortcuts (?)')
        : null,
    ),
  );

// The first time the page opens: the three things it is for, then out of the way.
export function showQuickStart(stage, project) {
  if (seen()) {
    return;
  }

  // pressed with the keys, the button shows their ring (a click's count of presses does not
  // say so in every browser)
  const gotIt = node(
    'button.btn.primary',
    { onclick: (event) => close(event.currentTarget.matches(':focus-visible')) },
    'Got it',
  );
  const onKey = (event) => event.key === 'Escape' && close(true);
  // getting on with it is an answer too: a press anywhere else puts the card away, and still
  // does what it was for
  const onPress = (event) => card.contains(event.target) || close();
  const close = (byKeys = false) => {
    remember();
    card.remove();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onPress, true);

    // put away with the keys, they go to the tool in hand, where they are when a project
    // opens: left on nothing, the next Tab began at the top of the page
    if (byKeys) {
      document.querySelector('#rail .btn.on')?.focus({ preventScroll: true });
    }
  };
  const card = cardOf(project, gotIt);

  stage.append(card);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPress, true);
  // without scrolling to it: on a short screen the card opened at its last step, its first cut off
  gotIt.focus({ preventScroll: true });
}
