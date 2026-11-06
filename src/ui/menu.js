import { node } from './dom.js';
import { focusables, rememberFocus } from './focus.js';

// called straight from the click, so a file picker it opens still counts as the viewer's doing
function run(action, onError) {
  try {
    Promise.resolve(action()).catch(onError);
  } catch (error) {
    onError(error);
  }
}

// below the anchor, or above it when there is no room below (menus of the frames, at the bottom)
function position(menu, anchor, align) {
  const box = anchor.getBoundingClientRect();
  const height = menu.offsetHeight;
  const below = box.bottom + 6 + height <= window.innerHeight - 8;

  menu.style.top = `${below ? box.bottom + 6 : Math.max(8, box.top - 6 - height)}px`;

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

  return node(
    `button${options.danger ? '.danger' : ''}`,
    {
      role: 'menuitem',
      disabled: Boolean(options.disabled),
      title: options.title,
      onclick: () => {
        close();
        run(action, onError);
      },
    },
    label,
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
  maxHeight: 'calc(100vh - 16px)',
  overflowY: 'auto',
};

export function openMenu(anchor, entries, { align = 'left', onError = () => {} } = {}) {
  // remembered before the menu open before closes, which gives focus back to its own button
  const restoreFocus = rememberFocus();
  closeOpenMenu?.();

  const menu = node('div.menu', { role: 'menu', style: MENU_STYLE });
  const close = () => {
    menu.remove();
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', onKey, true);
    closeOpenMenu = null;
    restoreFocus();
  };
  // a menu taken away with the page drawn over it lets go of the keys too
  const outside = (event) => {
    if (!menu.isConnected || (!menu.contains(event.target) && !anchor.contains(event.target))) {
      close();
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
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', onKey, true);
  closeOpenMenu = close;
  menu.querySelector('button:not(:disabled)')?.focus();

  return close;
}
