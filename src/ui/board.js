import { node, replace } from './dom.js';
import { directionsInUse } from './actions.js';
import { GAP, boardCanvas } from './board-canvas.js';
import { boardControls, guideSummary } from './board/board-controls.js';
import { bindBoardPointer } from './board/board-pointer.js';

// the largest scale (up to 5) at which every view fits side by side
function fittingScale(container, state) {
  const count = directionsInUse(state).length;
  const room = container.clientWidth - 64 - (count - 1) * GAP;

  return Math.max(1, Math.min(5, Math.floor(room / (count * state.project.canvas.width))));
}

function noteField(app) {
  return node('input.input', {
    placeholder: 'Note text, then click the board',
    id: 'note-text',
    'aria-label': 'Note text',
    value: app.noteText ?? '',
    oninput: (event) => {
      app.noteText = event.target.value;
    },
  });
}

// Every view side by side, to compare them, mark what to fix and leave notes.
export function mountBoard(container, app) {
  const holder = node('div');
  const inner = node('div.stage-inner.board');
  const note = noteField(app);
  const shown = { canvas: null, scale: 0 };
  container.replaceChildren(inner);

  return {
    render() {
      const { state } = app.store;
      const scale = fittingScale(container, state);
      const next = boardCanvas(state, scale);
      const same = shown.canvas?.width === next.width && shown.canvas?.height === next.height;

      // repaint in place when the size holds, so a mark being drawn keeps its pointer
      if (same && shown.scale === scale) {
        shown.canvas.getContext('2d').drawImage(next, 0, 0);
      } else {
        Object.assign(shown, { canvas: next, scale });
        next.classList.add('board-canvas');
        bindBoardPointer(app, next, scale);
        replace(holder, next);
      }

      shown.canvas.style.cursor = (state.markupMode ?? 'edit') === 'edit' ? 'pointer' : 'crosshair';
      replace(inner, boardControls(app, note), holder, guideSummary(state));
    },
  };
}
