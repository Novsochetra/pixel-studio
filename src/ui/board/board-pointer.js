import { selectDirection } from '../actions.js';
import { boardPoint } from '../board-canvas.js';
import { changeMarkup, markupOf } from './board-marks.js';
import { toast } from '../dom.js';
import { markAt } from '../../views/markup.js';

function addNote(app, point) {
  changeMarkup(app, 'Note', (markup) =>
    markup.notes.push({
      direction: point.direction,
      x: point.x,
      y: point.y,
      text: app.noteText.trim(),
    }),
  );
  // the field is cleared for the next note: left as it was, the next press pinned the same again
  app.noteText = '';
  Object.assign(document.getElementById('note-text') ?? {}, { value: '' });
}

// one mark or note, the one pressed: Clear marks and undo were the only ways to take one away
function rubOut(app, point, scale) {
  const { project } = app.store.state;
  const found = markAt(markupOf(project), point, { scale, width: project.canvas.width });

  if (found) {
    changeMarkup(app, found.kind === 'notes' ? 'Rub out note' : 'Rub out mark', (markup) =>
      markup[found.kind].splice(found.index, 1),
    );
  } else {
    toast('Press a mark or a note to rub it out.');
  }
}

// A click on the board opens that view, draws a mark or adds a note, as the board is set to.
// Returns the mark being drawn, if any.
function press(app, { canvas, scale }, point, event) {
  const { state } = app.store;
  const mode = state.markupMode ?? 'edit';

  if (mode === 'edit') {
    selectDirection(app, point.direction);
    app.store.set({ mode: 'edit' });

    return null;
  }

  if (mode === 'rub') {
    rubOut(app, point, scale);

    return null;
  }

  if (mode === 'note') {
    // a note with nothing typed was stamped as "Fix this", which nobody had written
    if (app.noteText?.trim()) {
      addNote(app, point);
    } else {
      toast('Type the note first, then press the board where it goes.');
      document.getElementById('note-text')?.focus();
    }

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
      drawing = press(app, { canvas, scale }, point, event);
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
