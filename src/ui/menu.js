import { node } from './dom.js';

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

  if (align === 'right') {
    menu.style.right = `${Math.max(8, window.innerWidth - box.right)}px`;
  } else {
    menu.style.left = `${Math.min(box.left, window.innerWidth - menu.offsetWidth - 8)}px`;
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

// A small menu of actions: entries are [label, action, { danger, disabled, title }] or null for
// a line between groups. Escape, a click outside or a choice closes it.
export function openMenu(anchor, entries, { align = 'left', onError = () => {} } = {}) {
  document.querySelector('.menu')?.remove();
  const menu = node('div.menu', { role: 'menu', style: { position: 'fixed', top: '0' } });
  const close = () => {
    menu.remove();
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', onKey, true);
  };
  const outside = (event) => {
    if (!menu.contains(event.target) && !anchor.contains(event.target)) {
      close();
    }
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      anchor.focus();
    }
  };

  menu.append(...entries.map((entry) => (entry ? item(entry, close, onError) : node('hr'))));
  document.body.append(menu);
  position(menu, anchor, align);
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', onKey, true);
  menu.querySelector('button:not(:disabled)')?.focus();

  return close;
}
