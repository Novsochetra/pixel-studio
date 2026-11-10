import { selectDirection } from '../actions.js';
import { boardPoint } from '../board-canvas.js';
import { changeMarkup, markupOf } from './board-marks.js';

function addNote(app, point) {
  changeMarkup(app, 'Note', (markup) =>
    markup.notes.push({
      direction: point.direction,
      x: point.x,
      y: point.y,
      text: app.noteText || 'Fix this',
    }),
  );
}

// A click on the board opens that view, draws a mark or adds a note, as the board is set to.
// Returns the mark being drawn, if any.
function press(app, canvas, point, event) {
  const { state } = app.store;
  const mode = state.markupMode ?? 'edit';

  if (mode === 'edit') {
    selectDirection(app, point.direction);
    app.store.set({ mode: 'edit' });

    return null;
  }

  if (mode === 'note') {
    addNote(app, point);

    return null;
  }

  canvas.setPointerCapture(event.pointerId);
  const stroke = { direction: point.direction, points: [[point.x, point.y]] };

  return { stroke, before: markupOf(state.project) };
}

// the mark being drawn shows as it grows, and is one undo step when the pointer lets go
function showMark(app, { stroke, before }) {
  app.store.state.project.markup = { ...before, strokes: [...before.strokes, stroke] };
  app.store.touch('markup');
}

export function bindBoardPointer(app, canvas, scale) {
  let drawing = null;
  const pointOf = (event) => boardPoint(app.store.state, scale, canvas, event);

  canvas.addEventListener('pointerdown', (event) => {
    const point = pointOf(event);

    // a press off the art (a second finger on a gap) leaves the mark being drawn alone
    if (point) {
      drawing = press(app, canvas, point, event);
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = drawing && pointOf(event);

    // a mark stays on the view it started on
    if (point && point.direction === drawing.stroke.direction) {
      drawing.stroke.points.push([point.x, point.y]);
      showMark(app, drawing);
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (drawing) {
      const { stroke, before } = drawing;

      drawing = null;
      app.store.state.project.markup = before;
      changeMarkup(app, 'Mark', (markup) => markup.strokes.push(stroke));
    }
  });
}
