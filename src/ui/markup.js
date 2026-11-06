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
    context.stroke();
  }

  context.font = `700 ${Math.max(11, Math.round(scale * 3.2))}px Silkscreen, ui-monospace, monospace`;

  for (const note of notes) {
    const width = context.measureText(note.text).width + 10;
    const height = Math.max(16, scale * 4.4);

    // a note near the right edge opens to the left, so it stays on its own view
    const x = Math.max(0, Math.min(note.x * scale, panelWidth - width));
    const y = Math.max(height, note.y * scale);
    context.fillStyle = colour;
    context.fillRect(x, y - height, width, height);
    context.fillStyle = NOTE_TEXT;
    context.fillText(note.text, x + 5, y - height * 0.28);
  }

  context.restore();
}

export function hasMarks(project) {
  return Boolean(project.markup && (project.markup.strokes.length || project.markup.notes.length));
}
