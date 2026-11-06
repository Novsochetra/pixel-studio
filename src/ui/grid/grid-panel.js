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

// The animation panel under the canvas: tabs, the frame grid, and play. onPlayFrame repaints the
// canvas while playing.
export function mountGridPanel(app, { isShown, onPlayFrame }) {
  const el = node('section.grid-panel', { 'aria-label': 'Animation' });
  const render = () =>
    keepFocus(el, () => {
      const playing = isPlaying(app);
      const onPlay = () =>
        togglePlayback(app, {
          isShown,
          onFrame: () => {
            onPlayFrame();
            render();
          },
        });
      replace(
        el,
        gridBar(app, { playing, onPlay }),
        gridBody(app, { all: app.store.state.gridAll, playFrame: app.playback?.frame ?? null }),
      );
    });

  return { el, render };
}
