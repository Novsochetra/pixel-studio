import { h } from './dom.js';
import { mountTimeline } from './timeline.js';
import { bindWheelZoom } from './navigate.js';
import { renderSelectionBar } from './selection-bar.js';
import { paint } from './stage-paint.js';
import { bindPointer } from './stage-pointer.js';
import { renderEmptyFrame } from './empty-frame.js';

export function fitZoom(area, sprite) {
  const margin = area.clientWidth < 600 ? 32 : 64;
  const room = Math.min((area.clientWidth - margin) / sprite.width, (area.clientHeight - margin) / sprite.height);

  return Math.max(1, Math.min(24, Math.floor(room)));
}

export function mountEditStage(container, app) {
  const canvas = h('canvas', { 'aria-label': 'Pixel canvas' });
  const timeline = mountTimeline(app);
  const bar = h('div.selection-bar', { role: 'toolbar', 'aria-label': 'Selection', hidden: true });
  const empty = h('div.empty-frame', { role: 'status', hidden: true });
  // only the canvas scrolls: zooming never moves the frames, and the bars float over it
  const area = h('div.canvas-area', {}, h('div.stage-inner.edit', {}, h('div.canvas-holder', {}, canvas)));
  container.replaceChildren(h('div.canvas-wrap', {}, bar, empty, area), timeline.el);
  bindPointer(canvas, app, area);
  bindWheelZoom(area, canvas, app);

  return {
    area,
    render(patch = {}) {
      paint(canvas, app);
      renderSelectionBar(bar, app);
      renderEmptyFrame(empty, app);

      if (!patch.stroke) {
        timeline.render();
      }
    },
  };
}
