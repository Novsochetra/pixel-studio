import { node } from './dom.js';
import { openShortcuts } from './shortcuts.js';

const SEEN = 'pixel-clean-quick-start';

function seen() {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(SEEN, '1');
  } catch {
    // private windows keep nothing; the card simply shows again next time
  }
}

const STEPS = [
  [
    'Clean: ',
    'drop an AI image on the canvas, or into a frame below it. Every view and frame is fitted to the first: same pixel size, place, colours. Projects (top left) holds the rest of your art.',
  ],
  ['Fix: ', 'touch up pixels with the pencil (B) and eraser (E). ⌘Z undoes anything.'],
  ['Use: ', 'Download gives PNGs at both sizes, sprite sheets and GIFs for your game.'],
];

// The first time the page opens: the three things it is for, then out of the way.
export function showQuickStart(stage) {
  if (seen()) {
    return;
  }

  const close = () => {
    remember();
    card.remove();
  };
  const card = node(
    'div.quick-start',
    { role: 'dialog', 'aria-label': 'Quick start' },
    node('h3', {}, 'Three steps'),
    node(
      'ol',
      {},
      STEPS.map(([title, text]) => node('li', {}, node('b', {}, title), text)),
    ),
    node(
      'div.group',
      { style: { gap: '6px' } },
      node('button.btn.primary', { onclick: close }, 'Got it'),
      node('button.btn.quiet', { onclick: () => openShortcuts() }, 'Shortcuts (?)'),
    ),
  );
  stage.append(card);
}
