import { node } from './dom.js';
import { drawGuide, drawSprite } from './draw.js';
import { checkerPainter } from '../io/images.js';

// A modal sheet; Escape or a click on the backdrop runs onClose.
export function openSheet(title, onClose) {
  const body = node(
    'div.sheet',
    { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    node('h3', {}, title),
  );
  const backdrop = node('div.sheet-backdrop', {}, body);
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

// a sprite on the original front image's green and white checkerboard, with the guide lines
export function previewCanvas(sprite, guides = [], scale = 3) {
  const canvas = node('canvas');
  canvas.width = sprite.width * scale;
  canvas.height = sprite.height * scale;
  const context = canvas.getContext('2d');
  checkerPainter(scale * 2)(context, canvas.width, canvas.height);
  drawSprite(context, sprite, scale);
  guides.forEach((guide) =>
    drawGuide(context, guide, { width: canvas.width, scale, label: false }),
  );

  return canvas;
}
