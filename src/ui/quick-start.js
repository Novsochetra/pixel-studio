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
  fingers: 'open Frames and put an AI image into a frame from its ⋯ menu.',
};

const FIX = {
  keys: keyNames('touch up pixels with the pencil (B) and eraser (E). ⌘Z undoes your steps.'),
  fingers:
    'draw with one finger, pinch with two to zoom and move. The arrows at the top undo your steps.',
};

const steps = (project, hands) => [
  [
    'Clean: ',
    `${CLEAN[hands]} ${isSingleView(project) ? 'Every frame' : 'Every view and frame'} is fitted to the first: same pixel size, place, colours. Projects (top left) holds the rest of your art.`,
  ],
  ['Fix: ', FIX[hands]],
  ['Use: ', 'Download gives PNGs at both sizes, sprite sheets and GIFs for your game.'],
];

// The first time the page opens: the three things it is for, then out of the way.
export function showQuickStart(stage, project) {
  if (seen()) {
    return;
  }

  const gotIt = node('button.btn.primary', { onclick: () => close() }, 'Got it');
  const onKey = (event) => event.key === 'Escape' && close();
  // getting on with it is an answer too: a press anywhere else puts the card away, and still
  // does what it was for
  const onPress = (event) => card.contains(event.target) || close();
  const close = () => {
    remember();
    card.remove();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onPress, true);
  };
  const card = node(
    'div.quick-start',
    { role: 'dialog', 'aria-label': 'Quick start' },
    node('h3', {}, 'Three steps'),
    node(
      'ol',
      {},
      steps(project, hasKeyboard() ? 'keys' : 'fingers').map(([title, text]) =>
        node('li', {}, node('b', {}, title), text),
      ),
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
  stage.append(card);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPress, true);
  gotIt.focus();
}
