import { cssVar } from './draw.js';
import { lassoSelection, loopPixels } from '../editor/lasso-select.js';

function traceEdges(context, cells, on, scale) {
  for (const [x, y] of cells) {
    if (!on(x, y - 1)) {
      context.rect(x * scale, y * scale, scale, 0);
    }

    if (!on(x, y + 1)) {
      context.rect(x * scale, (y + 1) * scale, scale, 0);
    }

    if (!on(x - 1, y)) {
      context.rect(x * scale, y * scale, 0, scale);
    }

    if (!on(x + 1, y)) {
      context.rect((x + 1) * scale, y * scale, 0, scale);
    }
  }
}

// a dashed outline round the selected cells
export function drawSelection(context, selection, scale) {
  const { width, height, cells } = selection;
  const on = (x, y) => x >= 0 && y >= 0 && x < width && y < height && cells[y * width + x];
  const selected = [];

  cells.forEach((cell, i) => cell && selected.push([i % width, Math.floor(i / width)]));
  context.save();
  context.beginPath();
  traceEdges(context, selected, on, scale);
  context.lineWidth = 2;
  context.strokeStyle = cssVar('--ink');
  context.stroke();
  context.setLineDash([4, 4]);
  context.strokeStyle = cssVar('--tint');
  context.stroke();
  context.restore();
}

// pixels an outline tool would change, ringed so they show on any colour
export function drawHighlight(context, points, scale) {
  context.save();
  context.lineWidth = Math.max(1, scale / 4);
  context.strokeStyle = cssVar('--mirror');

  for (const [x, y] of points) {
    context.strokeRect(x * scale + 0.5, y * scale + 0.5, scale - 1, scale - 1);
  }

  context.restore();
}

// dark and light, so the ring shows on any colour
export function drawBrush(context, pixels, scale) {
  const covered = new Set(pixels.map(([x, y]) => `${x},${y}`));

  context.save();
  context.beginPath();
  traceEdges(context, pixels, (x, y) => covered.has(`${x},${y}`), scale);
  context.lineWidth = 3;
  context.strokeStyle = cssVar('--ink');
  context.stroke();
  context.lineWidth = 1;
  context.strokeStyle = cssVar('--on-tint');
  context.stroke();
  context.restore();
}

// The lasso as it is drawn, in whole pixels: the pixels its line went over, and round what it
// would select if let go now, the same outline a selection has.
export function drawLoop(context, loop, { canvas, scale }) {
  const holds = lassoSelection(canvas, loop);

  context.save();
  context.globalAlpha = 0.55;
  context.fillStyle = cssVar('--tint');

  for (const [x, y] of loopPixels(loop)) {
    context.fillRect(x * scale, y * scale, scale, scale);
  }

  context.restore();

  if (holds) {
    drawSelection(context, holds, scale);
  }
}
