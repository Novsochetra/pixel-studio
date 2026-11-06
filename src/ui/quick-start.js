import { node } from './dom.js';
import { openShortcuts } from './shortcuts.js';
import { keepSetting, readSetting } from './remembered.js';
import { keyNames } from './platform-keys.js';
import { isSingleView } from '../model/kinds.js';

const SEEN = 'pixel-clean-quick-start';

const seen = () => Boolean(readSetting(SEEN, false));

const remember = () => keepSetting(SEEN, true);

const steps = (project) => [
  [
    'Clean: ',
    `drop an AI image on the canvas, or into a frame below it. ${isSingleView(project) ? 'Every frame' : 'Every view and frame'} is fitted to the first: same pixel size, place, colours. Projects (top left) holds the rest of your art.`,
  ],
  ['Fix: ', keyNames('touch up pixels with the pencil (B) and eraser (E). ⌘Z undoes anything.')],
  ['Use: ', 'Download gives PNGs at both sizes, sprite sheets and GIFs for your game.'],
];

// The first time the page opens: the three things it is for, then out of the way.
export function showQuickStart(stage, project) {
  if (seen()) {
    return;
  }

  const gotIt = node('button.btn.primary', { onclick: () => close() }, 'Got it');
  const onKey = (event) => event.key === 'Escape' && close();
  const close = () => {
    remember();
    card.remove();
    document.removeEventListener('keydown', onKey);
  };
  const card = node(
    'div.quick-start',
    { role: 'dialog', 'aria-label': 'Quick start' },
    node('h3', {}, 'Three steps'),
    node(
      'ol',
      {},
      steps(project).map(([title, text]) => node('li', {}, node('b', {}, title), text)),
    ),
    node(
      'div.group',
      { style: { gap: '6px' } },
      gotIt,
      node('button.btn.quiet', { onclick: () => openShortcuts() }, 'Shortcuts (?)'),
    ),
  );
  stage.append(card);
  document.addEventListener('keydown', onKey);
  gotIt.focus();
}
