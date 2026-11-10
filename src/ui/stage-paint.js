import {
  drawChecker,
  drawGrid,
  drawGuide,
  drawMirrorLine,
  drawSprite,
  sizeCanvas,
} from './draw.js';
import { currentFrames, directionSprite } from './actions.js';
import { drawPins } from './pins-draw.js';
import { drawLayersHandle } from './layer-turn.js';
import { drawTurnHandle } from './selection-turn.js';
import { drawBrush, drawHighlight, drawLoop, drawSelection } from './stage-marks.js';
import { BRUSH_TOOLS } from './tools-paint.js';
import { brushPixels } from '../editor/paint.js';
import { paintAllViews, playsAllViews } from './play-all-views.js';
import { drawsOnPart } from './body/part-draw.js';
import { drawPartOutline, drawPoseMarks } from './body/pose-marks.js';
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
      drawSprite(context, compositeFrame(frames[i], width, height), scale, alpha);
    }
  }
}

// a drag that names layers moves only those; any other moves the whole frame
function dragOf(state, layer) {
  const drag = state.frameDrag;

  return drag && (!drag.layers || drag.layers.includes(layer.key)) ? drag : { x: 0, y: 0 };
}

export function drawLayers(context, state, scale) {
  const frame = frameAt(state.project, state.at);

  for (const layer of frame.layers) {
    if (!layer.visible || !layer.sprite) {
      continue;
    }

    const mapped =
      state.swapPreview && layer.kind !== 'reference'
        ? applyMapping(layer.sprite, state.swapPreview)
        : layer.sprite;
    const sprite = layer.kind === 'reference' ? mapped : VIEW_FILTERS[state.viewFilter](mapped);
    const drag = dragOf(state, layer);

    context.save();
    context.translate(drag.x * scale, drag.y * scale);
    drawSprite(context, sprite, scale, layer.kind === 'reference' ? layer.opacity : 1);
    context.restore();
  }
}

// while the animation plays, the canvas shows the frame playing, without the editing marks
function shownState(app) {
  const { state } = app.store;

  if (!app.playback) {
    return state;
  }

  return {
    ...state,
    at: { ...state.at, frame: app.playback.frame },
    onion: false,
    selection: null,
    highlight: null,
    showPins: false,
    cursor: null,
    piece: null,
    tool: state.tool === 'pose' || state.tool === 'move' ? null : state.tool,
  };
}

function paintArt(context, state, scale) {
  const ghost =
    state.overlay.direction && state.overlay.direction !== state.at.direction
      ? directionSprite(state, state.overlay.direction)
      : null;

  if (ghost) {
    drawSprite(context, ghost, scale, state.overlay.opacity);
  }

  // lining a frame up with its neighbours needs them showing
  if (state.onion || state.tool === 'move') {
    drawOnion(context, state, scale);
  }

  drawLayers(context, state, scale);
}

function paintHelpers(context, state, { scale, ratio }) {
  const { width, height } = state.project.canvas;

  if (state.showGrid && scale >= 6) {
    drawGrid(context, { cols: width, rows: height }, { scale, ratio });
  }

  if (state.showGuides) {
    state.project.guides.forEach((guide) =>
      drawGuide(context, guide, { width: width * scale, scale }),
    );
  }

  if (state.symmetry.on) {
    drawMirrorLine(context, state.symmetry.axisSum, { height: height * scale, scale });
  }
}

function paintSelecting(context, state, scale) {
  if (state.selection) {
    drawSelection(context, state.selection, scale);
    drawTurnHandle(context, state, scale);
  } else {
    drawLayersHandle(context, state, scale);
  }

  if (state.highlight?.length) {
    drawHighlight(context, state.highlight, scale);
  }

  if (state.lassoLoop) {
    drawLoop(context, state.lassoLoop, { canvas: state.project.canvas, scale });
  }
}

function paintMarks(context, state, scale) {
  if (state.showPins) {
    const frames = currentFrames(state);
    const index = Math.min(state.at.frame, frames.length - 1);

    drawPins(context, frames[index], frames[index - 1] ?? null, scale);
  }

  paintSelecting(context, state, scale);

  // one pixel needs no ring: the pointer is on it
  if (state.cursor && state.brush.size > 1 && BRUSH_TOOLS.has(state.tool)) {
    drawBrush(context, brushPixels([state.cursor.x, state.cursor.y], state), scale);
  }

  if (state.tool === 'pose') {
    drawPoseMarks(context, state, scale);
  } else if (drawsOnPart(state)) {
    drawPartOutline(context, state, scale);
  }
}

export function paint(canvas, app) {
  if (playsAllViews(app)) {
    paintAllViews(canvas, app);

    return;
  }

  const state = shownState(app);
  const { width, height } = state.project.canvas;
  const scale = state.zoom;
  const { context, ratio } = sizeCanvas(canvas, width * scale, height * scale);

  drawChecker(context, { width: width * scale, height: height * scale }, scale * 2);
  paintArt(context, state, scale);
  paintHelpers(context, state, { scale, ratio });
  paintMarks(context, state, scale);
}
