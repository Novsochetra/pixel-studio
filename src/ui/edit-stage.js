import { node } from './dom.js';
import { mountTimeline } from './timeline.js';
import { bindWheelZoom } from './navigate.js';
import { renderSelectionBar } from './selection-bar.js';
import { paint } from './stage-paint.js';
import { bindPointer } from './stage-pointer.js';
import { renderEmptyFrame } from './empty-frame.js';

export function fitZoom(stage, sprite) {
  const margin = stage.clientWidth < 600 ? 32 : 64;
  const room = Math.min(
    (stage.clientWidth - margin) / sprite.width,
    (stage.clientHeight - margin - 120) / sprite.height,
  );

  return Math.max(1, Math.min(24, Math.floor(room)));
}

export function mountEditStage(container, app) {
  const canvas = node('canvas', { 'aria-label': 'Pixel canvas' });
  const timeline = mountTimeline(app);
  const bar = node('div.selection-bar', {
    role: 'toolbar',
    'aria-label': 'Selection',
    hidden: true,
  });
  const empty = node('div.empty-frame', { role: 'status', hidden: true });
  const inner = node(
    'div.stage-inner.edit',
    {},
    bar,
    empty,
    node('div.canvas-holder', {}, canvas),
    timeline.el,
  );
  container.replaceChildren(inner);
  bindPointer(canvas, app, container);
  bindWheelZoom(container, canvas, app);

  return {
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
