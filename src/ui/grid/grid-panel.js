import { node, replace } from '../dom.js';
import { gridBar } from './grid-bar.js';
import { gridBody } from './rows.js';
import { isPlaying, togglePlayback } from './playback.js';

const FOCUS_FOLLOWS = { '.cell': '.cell.selected', '.grid-tab': '.grid-tab[aria-selected="true"]' };

// keyboard focus stays on the selected frame, or the open tab, when the panel redraws around it
function keepFocus(el, draw) {
  const focused = el.contains(document.activeElement) ? document.activeElement : null;
  const kind = Object.keys(FOCUS_FOLLOWS).find((selector) => focused?.closest(selector));

  draw();

  if (kind) {
    el.querySelector(FOCUS_FOLLOWS[kind])?.focus();
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
  const open = strip?.querySelector('.grid-tab[aria-selected="true"]');

  if (!open || strip.scrollWidth <= strip.clientWidth) {
    return;
  }

  strip.scrollLeft = Math.max(0, open.offsetLeft + open.offsetWidth - strip.clientWidth);
}

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
  // a tab name being typed is never drawn over; the rename draws the panel when it is done
  const render = () =>
    !el.querySelector('.tab-rename') &&
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
