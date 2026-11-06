import { changeStructure, selectDirection } from '../actions.js';
import { boardPoint } from '../board-canvas.js';

function addNote(app, point) {
  app.store.state.project.markup.notes.push({
    direction: point.direction,
    x: point.x,
    y: point.y,
    text: app.noteText || 'Fix this',
  });
  changeStructure(app, 'markup');
}

// A click on the board opens that view, draws a mark or adds a note, as the board is set to.
// Returns the mark being drawn, if any.
function press(app, canvas, point, event) {
  const { state } = app.store;
  const mode = state.markupMode ?? 'edit';

  state.project.markup ??= { strokes: [], notes: [] };

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
  state.project.markup.strokes.push(stroke);

  return stroke;
}

export function bindBoardPointer(app, canvas, scale) {
  let stroke = null;
  const pointOf = (event) => boardPoint(app.store.state, scale, canvas, event);

  canvas.addEventListener('pointerdown', (event) => {
    const point = pointOf(event);

    // a press off the art (a second finger on a gap) leaves the mark being drawn alone
    if (point) {
      stroke = press(app, canvas, point, event);
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = stroke && pointOf(event);

    // a mark stays on the view it started on
    if (point && point.direction === stroke.direction) {
      stroke.points.push([point.x, point.y]);
      app.store.touch('markup');
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (stroke) {
      stroke = null;
      changeStructure(app, 'markup');
    }
  });
}
