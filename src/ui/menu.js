import { node } from './dom.js';
import { focusables, rememberFocus } from './focus.js';
import { leave } from './leave.js';

// called straight from the click, so a file picker it opens still counts as the viewer's doing
function run(action, onError) {
  try {
    Promise.resolve(action()).catch(onError);
  } catch (error) {
    onError(error);
  }
}

const EDGE = 8;
const GAP = 6;
const LEAST_HEIGHT = 132;

// how high a menu may reach: one opened from the page stops under the bar at the top, which
// stays in sight; one opened from that bar has the whole window
function topEdge(anchor) {
  const bar = document.getElementById('toolbar');

  return !bar || bar.contains(anchor) ? EDGE : bar.getBoundingClientRect().bottom + EDGE;
}

// Below the anchor, or above it when there is no room below (menus of the frames, at the bottom).
// A menu taller than the room on its side scrolls there: laid over its own button and the bar at
// the top, it hid where it came from.
function placeUpOrDown(menu, anchor) {
  const box = anchor.getBoundingClientRect();
  const top = topEdge(anchor);
  const roomBelow = window.innerHeight - box.bottom - GAP - EDGE;
  const roomAbove = box.top - GAP - top;
  const below = menu.offsetHeight <= roomBelow || roomBelow >= roomAbove;
  const height = Math.min(menu.offsetHeight, Math.max(LEAST_HEIGHT, below ? roomBelow : roomAbove));

  menu.style.maxHeight = `${height}px`;
  menu.style.top = `${below ? box.bottom + GAP : Math.max(top, box.top - GAP - height)}px`;
  menu.dataset.opens = below ? 'down' : 'up';
}

function position(menu, anchor, align) {
  const box = anchor.getBoundingClientRect();

  placeUpOrDown(menu, anchor);

  // a right-aligned menu under a button near the left edge (a phone's wrapped toolbar) would run
  // off the screen, so it is held inside it
  if (align === 'right' && box.right - menu.offsetWidth >= 8) {
    menu.style.right = `${Math.max(8, window.innerWidth - box.right)}px`;
  } else {
    menu.style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - menu.offsetWidth - 8))}px`;
  }
}

function item(entry, close, onError) {
  const [label, action, options = {}] = entry;
  const choice = options.checked !== undefined;

  return node(
    `button${options.danger ? '.danger' : ''}`,
    {
      role: choice ? 'menuitemcheckbox' : 'menuitem',
      'aria-checked': choice ? String(options.checked) : null,
      disabled: Boolean(options.disabled),
      title: options.title,
      onclick: () => {
        close();
        run(action, onError);
      },
    },
    label,
    // aria-checked says it to a screen reader: the mark itself stays out of the item's name
    options.checked ? node('span', { 'aria-hidden': 'true' }, '✓') : null,
  );
}

const STEPS = { ArrowDown: 1, ArrowUp: -1 };

// the arrow keys walk the items, round from the last to the first; Home and End jump
function moveFocus(menu, key) {
  const items = focusables(menu);
  const at = items.indexOf(document.activeElement);
  const jumps = { Home: 0, End: items.length - 1 };
  const next = key in jumps ? jumps[key] : (at + STEPS[key] + items.length) % items.length;

  items[next]?.focus();
}

// a menu is modal: other keys do nothing behind it, as the tool keys would redraw what it is for
function menuKey(menu, event, close) {
  event.stopPropagation();

  if (event.key === 'Escape' || event.key === 'Tab') {
    close();
  } else if (event.key in STEPS || event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    moveFocus(menu, event.key);
  }
}

let closeOpenMenu = null;

// the whole menu stays on screen, wherever its button has wrapped to
const MENU_STYLE = {
  position: 'fixed',
  top: '0',
  maxWidth: 'calc(100vw - 32px)',
  overflowY: 'auto',
};

export function openMenu(anchor, entries, { align = 'left', onError = () => {} } = {}) {
  // remembered before the menu open before closes, which gives focus back to its own button
  const restoreFocus = rememberFocus();
  closeOpenMenu?.();

  const menu = node('div.menu', { role: 'menu', style: MENU_STYLE });
  // the button it hangs from moves when the window changes size: the menu would stay behind
  const close = () => {
    leave(menu, 'menu-out');
    window.removeEventListener('resize', close);
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', onKey, true);
    closeOpenMenu = null;
    restoreFocus();
  };
  // a menu taken away with the page drawn over it lets go of the keys too
  const outside = (event) => {
    if (!menu.isConnected || (!menu.contains(event.target) && !anchor.contains(event.target))) {
      close();

      // on the canvas that press would also draw: there it only puts the menu away
      if (event.target.closest?.('canvas')) {
        event.stopPropagation();
      }
    }
  };
  const onKey = (event) => {
    if (!menu.isConnected) {
      close();
    } else if (event.key !== 'Enter' && event.key !== ' ') {
      menuKey(menu, event, close);
    }
  };

  // a message from before would cover the menu's lower items on a phone
  document.querySelector('.toast')?.remove();
  menu.append(...entries.map((entry) => (entry ? item(entry, close, onError) : node('hr'))));
  document.body.append(menu);
  position(menu, anchor, align);
  window.addEventListener('resize', close);
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', onKey, true);
  closeOpenMenu = close;
  menu.querySelector('button:not(:disabled)')?.focus();

  return close;
}
