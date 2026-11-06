import { node } from './dom.js';
import { drawChecker, drawGuide, drawSprite } from './draw.js';
import { focusables, rememberFocus, trapTab } from './focus.js';

function sheetHead(title, close) {
  return node(
    'div.sheet-head',
    {},
    node('h3', {}, title),
    node(
      'button.btn.quiet.sheet-close',
      { 'aria-label': 'Close window', title: 'Close (Esc)', onclick: () => close() },
      '×',
    ),
  );
}

// focusField: a text field takes focus first, where there is a pointer; a sheet whose fields
// are a list of names to change now and then leaves them be
export function openSheet(title, onClose, { wide = false, focusField = true } = {}) {
  const restoreFocus = rememberFocus();
  const body = node(`div.sheet${wide ? '.wide' : ''}`, {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  });
  const backdrop = node('div.sheet-backdrop', {}, body);
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
    restoreFocus();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      close();
    }

    trapTab(body, event);
  };

  body.append(sheetHead(title, close));
  backdrop.addEventListener('pointerdown', (event) => {
    if (event.target === backdrop) {
      close();
    }
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  // the content is added after this returns. A phone's keyboard would cover the sheet, so a
  // field takes focus only where there is a pointer.
  queueMicrotask(() => {
    const controls = focusables(body);
    const field =
      focusField && matchMedia('(pointer: fine)').matches
        ? controls.find((control) => control.matches('input:not([type=file]), textarea'))
        : null;
    (field ?? controls[0])?.focus();
  });

  return { body, close };
}

export function previewCanvas(sprite, guides = [], scale = 3) {
  const canvas = node('canvas');

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
