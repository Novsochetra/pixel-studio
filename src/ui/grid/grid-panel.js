import { node, replace } from '../dom.js';
import { gridBar } from './grid-bar.js';
import { gridBody } from './rows.js';
import { isPlaying, togglePlayback } from './playback.js';

// keyboard focus stays on the selected frame when the grid redraws around it
function keepFocus(el, draw) {
  const hadFocus = el.contains(document.activeElement) && document.activeElement.closest('.cell');
  draw();

  if (hadFocus) {
    el.querySelector('.cell.selected')?.focus();
  }
}

// Each frame of play only moves the marker: drawing the panel again would take the button, field
// or tab name being used out from under the pointer.
function markPlayFrame(el, frame) {
  for (const cells of el.querySelectorAll('.grid-cells')) {
    const columns = cells.querySelectorAll(':scope > .cell:not(.mirror), :scope > .grid-number');
    columns.forEach((column, index) => column.classList.toggle('playing', index === frame));
  }
}

// the strip is drawn anew each time, scrolled to its start: the open tab is brought back in sight
function showOpenTab(el) {
  const strip = el.querySelector('.grid-tabs');
  const open = strip?.querySelector('.grid-tab-group, .grid-tab[aria-selected="true"]');

  if (!open || strip.scrollWidth <= strip.clientWidth) {
    return;
  }

  const room = strip.clientWidth - (strip.querySelector('.grid-tab-add')?.offsetWidth ?? 0);
  strip.scrollLeft = Math.max(0, open.offsetLeft + open.offsetWidth - room);
}

// The animation panel under the canvas: tabs, the frame grid, and play. onPlayFrame repaints the
// canvas while playing.
export function mountGridPanel(app, { isShown, onPlayFrame }) {
  const el = node('section.grid-panel', { 'aria-label': 'Animation' });
  let shownPlaying = false;
  const onFrame = () => {
    onPlayFrame();

    if (isPlaying(app) === shownPlaying) {
      markPlayFrame(el, app.playback?.frame ?? null);
    } else {
      render();
    }
  };
  const render = () =>
    keepFocus(el, () => {
      shownPlaying = isPlaying(app);
      const onPlay = () => togglePlayback(app, { isShown, onFrame });
      replace(
        el,
        gridBar(app, { playing: shownPlaying, onPlay }),
        gridBody(app, { all: app.store.state.gridAll, playFrame: app.playback?.frame ?? null }),
      );
      showOpenTab(el);
    });

  return { el, render };
}
