import { node } from './dom.js';
import { bindWheelZoom } from './navigate.js';
import { renderSelectionBar } from './selection-bar.js';
import { paint } from './stage-paint.js';
import { bindPointer } from './stage-pointer.js';
import { renderEmptyFrame } from './empty-frame.js';
import { mountGridPanel } from './grid/grid-panel.js';
import { stopPlayback } from './grid/playback.js';

// The room above the frames changes as the grid grows (All views, a new animation) or the window
// does: a canvas that was fitted stays fitted, so its feet never hide under the frames.
function keepFitted(app, scroller, canvas) {
  const observer = new ResizeObserver(() => {
    if (!canvas.isConnected) {
      observer.disconnect();
    } else if (app.store.state.zoom === app.fittedZoom) {
      app.fitCanvas?.();
    }
  });
  observer.observe(scroller);
}

// changes that mean the person is working again, which stop a playing animation
const STOPS_PLAYING = ['at', 'pixels', 'animations', 'frames', 'layers', 'tool', 'selection'];

// What the frame grid shows. Drawing it again for anything else (a zoom, the pointer moving) would
// take a field or button being used out from under the person; a stroke redraws it once, at its end.
const GRID_KEYS = [
  'mode',
  'at',
  'pixels',
  'animations',
  'frames',
  'layers',
  'project',
  'gridAll',
  'gridOpen',
  'onion',
  'showPins',
  'pinName',
];

const showsInGrid = (patch) => {
  const keys = Object.keys(patch);

  return !patch.stroke && (!keys.length || keys.some((key) => GRID_KEYS.includes(key)));
};

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

function renderStage(app, { canvas, bar, empty, grid }, patch) {
  if (Object.keys(patch).some((key) => STOPS_PLAYING.includes(key))) {
    stopPlayback(app);
  }

  paint(canvas, app);

  // the pointer moving only moves the brush's ring, and that is on the canvas
  if (Object.keys(patch).join() === 'cursor') {
    return;
  }

  renderSelectionBar(bar, app);
  renderEmptyFrame(empty, app);

  if (showsInGrid(patch)) {
    grid.render();
  }
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
    onPlayFrame: () => {
      paint(canvas, app);
      renderEmptyFrame(empty, app);
    },
  });

  container.replaceChildren(node('div.edit-layout', {}, scroller, grid.el));
  bindPointer(canvas, app, scroller);
  bindWheelZoom(scroller, canvas, app);
  keepFitted(app, scroller, canvas);
  grid.render();

  const parts = { canvas, bar, empty, grid };

  return { render: (patch = {}) => renderStage(app, parts, patch) };
}
