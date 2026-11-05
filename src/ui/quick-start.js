import { h } from './dom.js';
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

// The first time the page opens: the three things it is for, then out of the way.
export function showQuickStart(stage) {
  if (seen()) {
    return;
  }

  const card = h('div.quick-start', { role: 'dialog', 'aria-label': 'Quick start' },
    h('h3', {}, 'Three steps'),
    h('ol', {},
      h('li', {}, h('b', {}, 'Clean: '), 'drop a ChatGPT image on the canvas. Each view is fitted to the first one: same pixel size, feet, colours. Projects (top left) holds your other characters.'),
      h('li', {}, h('b', {}, 'Fix: '), 'touch up pixels with the pencil (B) and eraser (E). ⌘Z undoes anything.'),
      h('li', {}, h('b', {}, 'Use: '), 'Download gives 160 or 800 px PNGs, or sprite sheets for the game.')),
    h('div.group', { style: { gap: '6px' } },
      h('button.btn.primary', { onclick: () => { remember(); card.remove(); } }, 'Got it'),
      h('button.btn.quiet', { onclick: () => openShortcuts() }, 'Shortcuts (?)')));
  stage.append(card);
}
