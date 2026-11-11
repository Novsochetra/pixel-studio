import { node, replace } from '../dom.js';
import { gridBar } from './grid-bar.js';
import { gridBody } from './rows.js';
import { isPlaying, togglePlayback } from './playback.js';
import { gridPlace, keepGridPlace } from './grid-place.js';
import { watchMore } from '../more-behind.js';
import { keepFocus as keepKeys } from '../keep-focus.js';
import { panelGrab, pullsShut } from '../panel-sheet.js';

const FOCUS_FOLLOWS = { '.cell': '.cell.selected', '.grid-tab': '.grid-tab[aria-selected="true"]' };

// Keyboard focus stays on the selected frame, or the open tab, when the panel redraws around it;
// on any other control it stays where that control stood, as Play does when it turns to Pause.
// The panel draws itself while it plays, outside the page's own redraws.
function keepFocus(el, draw) {
  const focused = el.contains(document.activeElement) ? document.activeElement : null;
  const kind = Object.keys(FOCUS_FOLLOWS).find((selector) => focused?.closest(selector));

  keepKeys(el, draw);

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

// The strip is drawn anew each time, scrolled to its start: the open tab is brought back in
// sight, and the strip marked while tabs wait past either end of it.
function showOpenTab(el) {
  const strip = el.querySelector('.grid-tabs');
  const open = strip?.querySelector('.grid-tab[aria-selected="true"]');

  if (!open) {
    return;
  }

  if (strip.scrollWidth > strip.clientWidth) {
    strip.scrollLeft = Math.max(0, open.offsetLeft + open.offsetWidth - strip.clientWidth);
  }

  watchMore(strip);
}

export function mountGridPanel(app, { isShown, onPlayFrame }) {
  const el = node('section.grid-panel', { 'aria-label': 'Animation' });
  let shownPlaying = false;
  let shownAt = '';
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
      const { gridAll, layout, at } = app.store.state;
      const place = gridPlace(el);
      const editing = [at.animation, at.direction, at.frame].join();
      // a phone opens and shuts the whole panel from the dock, so it is never folded there
      const gridOpen = app.store.state.gridOpen || layout === 'compact';
      shownPlaying = isPlaying(app);
      const onPlay = () => togglePlayback(app, { isShown, onFrame });
      el.classList.toggle('folded', !gridOpen);
      replace(
        el,
        layout === 'compact' ? panelGrab(app) : null,
        gridBar(app, { playing: shownPlaying, onPlay }),
        gridOpen ? gridBody(app, { all: gridAll, playFrame: app.playback?.frame ?? null }) : null,
      );
      showOpenTab(el);
      keepGridPlace(el, place, editing !== shownAt);
      shownAt = editing;
    });

  pullsShut(el, app);

  return { el, render };
}
