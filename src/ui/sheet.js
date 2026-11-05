import { h } from './dom.js';
import { drawChecker, drawGuide, drawSprite } from './draw.js';

// A modal sheet; Escape or a click on the backdrop runs onClose.
export function openSheet(title, onClose, { wide = false } = {}) {
  const closeButton = h('button.btn.quiet.sheet-close', { 'aria-label': 'Close window', title: 'Close (Esc)', onclick: () => close() }, '×');
  const body = h(`div.sheet${wide ? '.wide' : ''}`, { role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div.sheet-head', {}, h('h3', {}, title), closeButton));
  const backdrop = h('div.sheet-backdrop', {}, body);
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      close();
    }
  };
  backdrop.addEventListener('pointerdown', (event) => {
    if (event.target === backdrop) {
      close();
    }
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);

  return { body, close };
}

// a sprite on the app's own checkerboard, with the guide lines
export function previewCanvas(sprite, guides = [], scale = 3) {
  const canvas = h('canvas');
  canvas.width = sprite.width * scale;
  canvas.height = sprite.height * scale;
  const context = canvas.getContext('2d');
  drawChecker(context, 0, 0, canvas.width, canvas.height, scale * 4);
  drawSprite(context, sprite, 0, 0, scale);
  guides.forEach((guide) => drawGuide(context, guide, 0, 0, canvas.width, scale, false));

  return canvas;
}
