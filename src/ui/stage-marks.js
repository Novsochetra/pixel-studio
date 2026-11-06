import { cssVar } from './draw.js';

// a dashed outline round the selected cells
export function drawSelection(context, selection, scale) {
  const { width, height, cells } = selection;
  const on = (x, y) => x >= 0 && y >= 0 && x < width && y < height && cells[y * width + x];

  context.save();
  context.beginPath();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!on(x, y)) {
        continue;
      }

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
