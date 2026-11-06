import { node } from './dom.js';
import { bindWheelZoom } from './navigate.js';
import { renderSelectionBar } from './selection-bar.js';
import { paint } from './stage-paint.js';
import { bindPointer } from './stage-pointer.js';
import { renderEmptyFrame } from './empty-frame.js';
import { mountGridPanel } from './grid/grid-panel.js';
import { stopPlayback } from './grid/playback.js';

// changes that mean the person is working again, which stop a playing animation
const STOPS_PLAYING = ['at', 'pixels', 'animations', 'frames', 'layers', 'tool', 'selection'];

// the zoom at which the canvas fits the part of the stage above the frames
export function fitZoom(stage, sprite) {
  const area = stage.querySelector('.edit-scroll') ?? stage;
  const margin = area.clientWidth < 600 ? 32 : 64;
  const room = Math.min(
    (area.clientWidth - margin) / sprite.width,
    (area.clientHeight - margin) / sprite.height,
  );

  return Math.max(1, Math.min(24, Math.floor(room)));
}

export function mountEditStage(container, app) {
  const canvas = node('canvas', { 'aria-label': 'Pixel canvas' });
  const bar = node('div.selection-bar', {
    role: 'toolbar',
    'aria-label': 'Selection',
    hidden: true,
  });
  const empty = node('div.empty-frame', {
    role: 'group',
    'aria-label': 'This frame is empty',
    hidden: true,
  });
  const inner = node('div.stage-inner.edit', {}, bar, empty, node('div.canvas-holder', {}, canvas));
  const scroller = node('div.edit-scroll', {}, inner);
  const grid = mountGridPanel(app, {
    isShown: () => canvas.isConnected,
    onPlayFrame: () => paint(canvas, app),
  });
  container.replaceChildren(node('div.edit-layout', {}, scroller, grid.el));
  bindPointer(canvas, app, scroller);
  bindWheelZoom(scroller, canvas, app);

  return {
    render(patch = {}) {
      if (Object.keys(patch).some((key) => STOPS_PLAYING.includes(key))) {
        stopPlayback(app);
      }

      paint(canvas, app);
      renderSelectionBar(bar, app);
      renderEmptyFrame(empty, app);

      if (!patch.stroke) {
        grid.render();
      }
    },
  };
}
