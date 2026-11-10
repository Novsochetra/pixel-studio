import { cssVar } from './draw.js';
import { NOTE_TEXT } from '../art/editor-colours.js';

// Marks are kept in art pixels on each view, so they stay put at any zoom:
// project.markup = { strokes: [{ direction, points: [[x, y], …] }], notes: [{ direction, x, y, text }] }

export function marksFor(project, direction) {
  const markup = project.markup ?? { strokes: [], notes: [] };

  return {
    strokes: markup.strokes.filter((stroke) => stroke.direction === direction),
    notes: markup.notes.filter((note) => note.direction === direction),
  };
}

// a note's words in lines no wider than its view: on one line, a long note ran off the view's edge
function noteLines(context, text, room) {
  const lines = [];

  for (const word of text.split(' ')) {
    const longer = lines.length ? `${lines.at(-1)} ${word}` : word;

    if (lines.length && context.measureText(longer).width <= room) {
      lines[lines.length - 1] = longer;
    } else {
      lines.push(word);
    }
  }

  return lines;
}

function drawNote(context, note, { scale, panelWidth, colour }) {
  const lines = noteLines(context, note.text, panelWidth - 10);
  const width = Math.max(...lines.map((line) => context.measureText(line).width)) + 10;
  const line = Math.max(16, scale * 4.4);
  const height = line * lines.length;
  // a note near the right edge opens to the left, so it stays on its own view
  const x = Math.max(0, Math.min(note.x * scale, panelWidth - width));
  const y = Math.max(height, note.y * scale);

  context.fillStyle = colour;
  context.fillRect(x, y - height, Math.min(width, panelWidth), height);
  context.fillStyle = NOTE_TEXT;
  lines.forEach((words, i) => context.fillText(words, x + 5, y - height + line * (i + 0.72)));
}

// the marks and notes on one view's panel of the board, at its scale
export function drawMarks(context, project, direction, scale) {
  const panelWidth = project.canvas.width * scale;
  const { strokes, notes } = marksFor(project, direction);
  const colour = cssVar('--guide');

  context.save();
  context.strokeStyle = colour;
  context.lineWidth = Math.max(2, scale * 0.8);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const stroke of strokes) {
    context.beginPath();
    stroke.points.forEach(([x, y], i) =>
      i
        ? context.lineTo((x + 0.5) * scale, (y + 0.5) * scale)
        : context.moveTo((x + 0.5) * scale, (y + 0.5) * scale),
    );

    // a press with no drag is a mark of one point: a dot, where nothing at all was drawn
    if (stroke.points.length === 1) {
      context.lineTo(...stroke.points[0].map((value) => (value + 0.5) * scale));
    }

    context.stroke();
  }

  context.font = `700 ${Math.max(11, Math.round(scale * 3.2))}px Silkscreen, ui-monospace, monospace`;
  notes.forEach((note) => drawNote(context, note, { scale, panelWidth, colour }));
  context.restore();
}

export function hasMarks(project) {
  return Boolean(project.markup && (project.markup.strokes.length || project.markup.notes.length));
}
