import { node } from './dom.js';
import { MAX_ZOOM, MIN_ZOOM, QUARTER_ZOOM, bindWheelZoom } from './navigate.js';
import { renderLayerTurnBar } from './layer-turn-bar.js';
import { renderSelectionBar } from './selection-bar.js';
import { standsBeside } from './selection-beside.js';
import { paint } from './stage-paint.js';
import { bindPointer } from './stage-pointer.js';
import { renderEmptyFrame } from './empty-frame.js';
import { mountGridPanel } from './grid/grid-panel.js';
import { mountGridResizer } from './grid/grid-resizer.js';
import { stopPlayback } from './grid/playback.js';
import { renderPoseBar } from './body/pose-bar.js';
import { renderPinBar } from './grid/pin-controls.js';
import { placeText } from './status-bar.js';

// The room above the frames changes as the grid grows (All views, a new animation) or the window
// does: a canvas that was fitted stays fitted, so its feet never hide under the frames.
function keepFitted(app, scroller, canvas) {
  const refit = () => {
    if (canvas.isConnected && app.store.state.zoom === app.fittedZoom) {
      app.fitCanvas?.();
    }
  };
  // fitted a frame later: a canvas resized while the sizes are being told is a loop to Safari,
  // which reports it as an error of the page
  const observer = new ResizeObserver(() =>
    canvas.isConnected ? requestAnimationFrame(refit) : observer.disconnect(),
  );

  observer.observe(scroller);
}

// changes that mean the person is working again, which stop a playing animation
const STOPS_PLAYING = ['at', 'pixels', 'animations', 'frames', 'layers', 'tool', 'selection'];

// What the frame grid shows. Drawing it again for anything else (a zoom, the pointer moving) would
// take a field or button being used out from under the person; a stroke redraws it once, at its end.
const GRID_KEYS = [
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
  // the Pin tool's own controls stand in the frames' bar: they come and go with the tool
  'tool',
  'layout',
  // a phone's frames are drawn while their sheet is shut, with no width to scroll the open
  // tab into sight by: they are drawn again as the sheet opens
  'panel',
];

const showsInGrid = (patch) => {
  const keys = Object.keys(patch);

  return !patch.stroke && (!keys.length || keys.some((key) => GRID_KEYS.includes(key)));
};

const TIGHT = { across: 16, down: 16 };

// with a phone's sheet up, the stylesheet keeps room under the canvas for a bar
// (71-phone-sheets.css): more at the stage's foot than any margin of its own
const BAR_ROOM_PX = 48;

// the zoom at which the canvas fits the part of the stage above the frames
export function fitZoom(stage, sprite) {
  const area = stage.querySelector('.edit-scroll') ?? stage;
  const inner = area.querySelector('.stage-inner') ?? area;

  inner.classList.remove('tight');

  // the stage's own padding, which the stylesheet sets by the room there is
  const padding = getComputedStyle(inner);
  const across = parseFloat(padding.paddingLeft) + parseFloat(padding.paddingRight);
  const down = parseFloat(padding.paddingTop) + parseFloat(padding.paddingBottom);
  const roomWith = (edge) =>
    Math.min(
      (area.clientWidth - edge.across) / sprite.width,
      (area.clientHeight - edge.down) / sprite.height,
    );
  const fit = Math.floor(roomWith({ across, down }));
  // A canvas shown at its own size has the most to gain from a whole step more: the stage gives
  // up its margins for it (`.tight`), or the step would put its last rows out of sight. A
  // tablet held wide left a 160 pixel canvas at 100%, with room for 200%. Not with a phone's
  // sheet up: the room under the canvas there is a bar's, and a canvas grown into it had its
  // last rows under the bar of a selection.
  const keepsBarRoom = parseFloat(padding.paddingBottom) >= BAR_ROOM_PX;
  const tight = fit < 2 && !keepsBarRoom ? Math.floor(roomWith(TIGHT)) : fit;

  inner.classList.toggle('tight', tight > fit);

  if (tight >= 1) {
    return Math.min(MAX_ZOOM, tight);
  }

  // A canvas larger than the window is shown at a half, whole, where at 100% part of it was out
  // of sight; and at a quarter where the half does not fit either.
  const room = roomWith(keepsBarRoom ? { across, down } : TIGHT);

  return room >= MIN_ZOOM ? MIN_ZOOM : QUARTER_ZOOM;
}

// Where a phone has room beside the canvas and none under it (held on its side), these bars
// are cards in the stage's corner, as the selection's is: the stylesheet lays them out
// (72-selection-beside.css).
function placeBars(bars, layout) {
  const side = layout === 'compact' && standsBeside(layout) ? 'beside' : '';

  bars.forEach((el) => {
    el.dataset.side = side;
  });
}

function renderStage(app, parts, patch) {
  const { canvas, bar, turnBar, poseBar, pinBar, place, empty, grid } = parts;

  if (Object.keys(patch).some((key) => STOPS_PLAYING.includes(key))) {
    stopPlayback(app);
  }

  paint(canvas, app);
  canvas.dataset.tool = app.store.state.tool;

  // the pointer moving only moves the brush's ring, and that is on the canvas
  if (Object.keys(patch).join() === 'cursor') {
    return;
  }

  renderSelectionBar(bar, app);
  renderLayerTurnBar(turnBar, app);
  renderPoseBar(poseBar, app);
  renderPinBar(pinBar, app);
  placeBars([turnBar, poseBar, pinBar], app.store.state.layout);
  place.textContent = placeText(app.store.state);
  renderEmptyFrame(empty, app);

  if (showsInGrid(patch)) {
    grid.render();
  }
}

function overlays() {
  const bar = (className, label) =>
    node(className, { role: 'toolbar', 'aria-label': label, hidden: true });

  return {
    bar: bar('div.selection-bar', 'Selection'),
    turnBar: bar('div.layer-turn-bar', 'Turn layers'),
    poseBar: bar('div.pose-bar', 'Pose'),
    pinBar: bar('div.pin-bar', 'Pins'),
    // a phone has no status bar: with its panels shut, nothing said which frame this is
    place: node('div.stage-place'),
    empty: node('div.empty-frame', {
      role: 'group',
      'aria-label': 'This frame is empty',
      hidden: true,
    }),
  };
}

export function mountEditStage(container, app) {
  const canvas = node('canvas', { 'aria-label': 'Pixel canvas' });
  const { bar, turnBar, poseBar, pinBar, place, empty } = overlays();
  const holder = node('div.canvas-holder', {}, canvas);
  const scroller = node('div.edit-scroll', {}, node('div.stage-inner.edit', {}, holder));
  // beside the scroller, not in it: zoomed in, what floats went off with the canvas
  const area = node('div.edit-area', {}, scroller, place, bar, turnBar, poseBar, pinBar, empty);
  const grid = mountGridPanel(app, {
    isShown: () => canvas.isConnected,
    onPlayFrame: () => {
      paint(canvas, app);
      renderEmptyFrame(empty, app);
    },
  });

  const layout = node('div.edit-layout', {}, area, grid.el);

  container.replaceChildren(layout);
  mountGridResizer(layout, grid.el, () => app.store.state.project.canvas.height + TIGHT.down);
  bindPointer(canvas, app, scroller);
  bindWheelZoom(scroller, canvas, app);
  keepFitted(app, scroller, canvas);
  grid.render();

  const parts = { canvas, bar, turnBar, poseBar, pinBar, place, empty, grid };

  return { render: (patch = {}) => renderStage(app, parts, patch) };
}
