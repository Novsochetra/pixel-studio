import { icon, node } from './dom.js';
import { drawGuide, drawSprite } from './draw.js';
import { drawChecker } from './checker.js';
import { focusables, rememberFocus, trapTab } from './focus.js';
import { leave } from './leave.js';
import { pullToClose } from './sheet-pull.js';
import { watchBelow } from './more-behind.js';
import { pinTop } from './sheet-pin.js';

function sheetHead(title, close) {
  return node(
    'div.sheet-head',
    {},
    node('h3', {}, title),
    node(
      'button.btn.quiet.sheet-close',
      { 'aria-label': 'Close window', title: 'Close (Esc)', onclick: () => close() },
      icon('close'),
    ),
  );
}

// The window's content is added after it opens. A phone's keyboard would cover the sheet, so a
// field takes focus only where there is a pointer.
function focusFirst(body, focusField) {
  const controls = focusables(body);
  const field =
    focusField && matchMedia('(pointer: fine)').matches
      ? controls.find((control) => control.matches('input:not([type=file]), textarea'))
      : null;

  (field ?? controls[0])?.focus();
}

// focusField: a text field takes focus first, where there is a pointer; a sheet whose fields
// are a list of names to change now and then leaves them be. mayClose: a window holding work that
// closing would lose says no, and asks.
// Marked while more of the window waits under the buttons at its foot, which say nothing of it:
// as its contents change, and as the browser's window does.
function marksBelow(body) {
  const mark = () => (body.isConnected ? watchBelow(body) : removeEventListener('resize', mark));

  new MutationObserver(mark).observe(body, { childList: true, subtree: true });
  addEventListener('resize', mark);
}

// Only the window on top answers the keys: with the line-up open over Projects, Escape shut
// both, where it was meant to go back to the list.
const onTop = (backdrop) => backdrop === [...document.querySelectorAll('.sheet-backdrop')].at(-1);

function closesOutside(backdrop, close) {
  backdrop.addEventListener('pointerdown', (event) => {
    if (event.target === backdrop) {
      close();
    }
  });
}

export function openSheet(title, onClose, { wide = false, focusField = true, mayClose } = {}) {
  const restoreFocus = rememberFocus();
  const body = node(`div.sheet${wide ? '.wide' : ''}`, {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  });
  const backdrop = node('div.sheet-backdrop', {}, body);
  const close = () => {
    if (mayClose && !mayClose()) {
      return;
    }

    body.classList.replace('sheet', 'sheet-out');
    leave(backdrop, 'sheet-backdrop-out');
    document.removeEventListener('keydown', onKey);
    onClose?.();
    restoreFocus();
  };
  const onKey = (event) => {
    if (!onTop(backdrop)) {
      return;
    }

    if (event.key === 'Escape') {
      close();
    }

    trapTab(body, event);
  };

  const head = sheetHead(title, close);

  body.append(head);
  pullToClose({ head, body, close });
  closesOutside(backdrop, close);
  document.addEventListener('keydown', onKey);
  // a message from before would lie over the window's title
  document.querySelector('.toast')?.remove();
  document.body.append(backdrop);
  queueMicrotask(() => focusFirst(body, focusField));
  marksBelow(body);
  pinTop(body, backdrop);

  return { body, close };
}

export function previewCanvas(sprite, guides = [], scale = 3) {
  const canvas = node('canvas', { role: 'img', 'aria-label': 'Preview' });

  canvas.width = sprite.width * scale;
  canvas.height = sprite.height * scale;
  const context = canvas.getContext('2d');
  drawChecker(context, canvas, scale * 4);
  drawSprite(context, sprite, scale);
  guides.forEach((guide) =>
    drawGuide(context, guide, { width: canvas.width, scale, label: false }),
  );

  return canvas;
}
