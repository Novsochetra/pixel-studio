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

// A press on the board draws a mark, rubs one out or adds a note, as the board is set to.
// Returns the mark being drawn, if any.
function press(app, { canvas, scale }, point, event) {
  const { state } = app.store;
  const mode = state.markupMode ?? 'edit';

  // a view is opened by a click, not at the press: the press may be a finger about to scroll
  if (mode === 'edit') {
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

// Chromium on a phone takes a finger lifted from a mark while still moving for a fling, and
// swallows the tap after it: a mark's touches are the board's alone. Opening a view keeps the
// browser's, as a finger scrolls a wide board sideways then.
function ownMarkTouches(app, canvas) {
  for (const kind of ['touchstart', 'touchmove']) {
    canvas.addEventListener(
      kind,
      (event) => (app.store.state.markupMode ?? 'edit') !== 'edit' && event.preventDefault(),
      { passive: false },
    );
  }
}

export function bindBoardPointer(app, canvas, scale) {
  let drawing = null;

  ownMarkTouches(app, canvas);

  const pointOf = (event) => boardPoint(app.store.state, scale, canvas, event);

  canvas.addEventListener('pointerdown', (event) => {
    const point = pointOf(event);

    // a press off the art (a second finger on a gap) leaves the mark being drawn alone
    if (point) {
      drawing = press(app, { canvas, scale }, point, event);
    }
  });
  // Opened at the press, a view was opened by the finger that came to scroll the board: the
  // third view of a phone's board could not be brought on screen at all.
  canvas.addEventListener('click', (event) => {
    const point = pointOf(event);

    if (point && (app.store.state.markupMode ?? 'edit') === 'edit') {
      selectDirection(app, point.direction);
      app.store.set({ mode: 'edit' });
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
