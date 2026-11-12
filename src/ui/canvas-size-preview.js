import { node, replace } from './dom.js';
import { previewCanvas } from './sheet.js';
import { canvasShift, placedSprite } from '../model/canvas-size.js';
import { compositeFrame } from '../model/composite.js';
import { frameAt } from '../model/project.js';

const ROOM = { width: 220, height: 150 };

// what the frame being edited would be on the canvas asked for: art that a smaller canvas cuts
// off is seen to go before it goes, where the window only said it would
export function sizePreview(app) {
  const el = node('div.size-preview', { 'aria-hidden': 'true' });
  const { project, at } = app.store.state;
  const art = compositeFrame(frameAt(project, at), project.canvas.width, project.canvas.height);

  const show = (size, anchor) => {
    const shift = canvasShift(project.canvas, size, anchor);
    const fit = Math.min(ROOM.width / size.width, ROOM.height / size.height);
    const scale = fit >= 1 ? Math.min(4, Math.floor(fit)) : fit;

    replace(el, previewCanvas(placedSprite(art, size, shift), [], scale));
  };

  return { el, show };
}
