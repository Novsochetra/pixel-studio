import { cssVar, drawChecker, drawGrid, drawGuide, drawMirrorLine, drawSprite, sizeCanvas } from './draw.js';
import { currentFrames, directionSprite } from './actions.js';
import { drawPins } from './pins-draw.js';
import { frameAt } from '../model/project.js';
import { compositeFrame } from '../model/composite.js';
import { applyMapping } from '../palette/palette.js';
import { VIEW_FILTERS } from '../views/filters.js';

export function drawOnion(context, state, scale) {
  const frames = currentFrames(state);
  const { width, height } = state.project.canvas;
  const index = Math.min(state.at.frame, frames.length - 1);
  const neighbours = [
    [index - 1, 0.28],
    [index + 1, 0.14],
  ];

  for (const [i, alpha] of neighbours) {
    if (i >= 0 && i < frames.length) {
      drawSprite(context, compositeFrame(frames[i], width, height), 0, 0, scale, alpha);
    }
  }
}

export function drawLayers(context, state, scale) {
  const frame = frameAt(state.project, state.at);
  const drag = state.frameDrag ?? { x: 0, y: 0 };

  for (const layer of frame.layers) {
    if (!layer.visible || !layer.sprite) {
      continue;
    }

    const mapped = state.swapPreview && layer.kind !== 'reference' ? applyMapping(layer.sprite, state.swapPreview) : layer.sprite;
    const sprite = layer.kind === 'reference' ? mapped : VIEW_FILTERS[state.viewFilter](mapped);
    drawSprite(context, sprite, drag.x * scale, drag.y * scale, scale, layer.kind === 'reference' ? layer.opacity : 1);
  }
}

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

      if (!on(x, y - 1)) context.rect(x * scale, y * scale, scale, 0);
      if (!on(x, y + 1)) context.rect(x * scale, (y + 1) * scale, scale, 0);
      if (!on(x - 1, y)) context.rect(x * scale, y * scale, 0, scale);
      if (!on(x + 1, y)) context.rect((x + 1) * scale, y * scale, 0, scale);
    }
  }

  context.lineWidth = 2;
  context.strokeStyle = '#000000';
  context.stroke();
  context.setLineDash([4, 4]);
  context.strokeStyle = cssVar('--tint');
  context.stroke();
  context.restore();
}

export function paint(canvas, app) {
  const { state } = app.store;
  const { width, height } = state.project.canvas;
  const scale = state.zoom;
  const { context, ratio } = sizeCanvas(canvas, width * scale, height * scale);
  drawChecker(context, 0, 0, width * scale, height * scale, scale * 2);
  const ghost = state.overlay.direction && state.overlay.direction !== state.at.direction ? directionSprite(state, state.overlay.direction) : null;

  if (ghost) {
    drawSprite(context, ghost, 0, 0, scale, state.overlay.opacity);
  }

  if (state.onion || state.tool === 'moveframe') {
    drawOnion(context, state, scale);
  }

  drawLayers(context, state, scale);

  if (state.showGrid && scale >= 6) {
    drawGrid(context, 0, 0, width, height, scale, ratio);
  }

  if (state.showGuides) {
    state.project.guides.forEach((guide) => drawGuide(context, guide, 0, 0, width * scale, scale));
  }

  if (state.symmetry.on) {
    drawMirrorLine(context, state.symmetry.axisSum, 0, 0, height * scale, scale);
  }

  if (state.showPins) {
    const frames = currentFrames(state);
    const index = Math.min(state.at.frame, frames.length - 1);
    drawPins(context, frames[index], frames[index - 1] ?? null, scale);
  }

  if (state.selection) {
    drawSelection(context, state.selection, scale);
  }

  if (state.highlight?.length) {
    drawHighlight(context, state.highlight, scale);
  }
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
