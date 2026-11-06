import { node } from '../dom.js';
import { cssVar, drawChecker, drawSprite, sizeCanvas } from '../draw.js';
import { PART_COLOURS } from '../../art/editor-colours.js';
import { bounds } from '../../model/sprite.js';
import { linePoints } from '../../editor/paint.js';
import { paintOwners, pivotsOf } from '../../model/body/cut-plan.js';
import { drawLasso, lassoDrag } from './cut-lasso.js';

// The art with each part painted over in its colour, and the pivots each part turns about. The
// brush gives pixels to the part picked; a pivot is dragged where the part should turn.

const ROOM = { width: 440, height: 420 };
const MARGIN = 3;

export const partColour = (index) => PART_COLOURS[index % PART_COLOURS.length];

function viewBox(source) {
  const box = bounds(source) ?? { left: 0, top: 0, right: source.width, bottom: source.height };
  const left = Math.max(0, box.left - MARGIN);
  const top = Math.max(0, box.top - MARGIN);
  const width = Math.min(source.width, box.right + MARGIN) - left;
  const height = Math.min(source.height, box.bottom + MARGIN) - top;
  const scale = Math.max(2, Math.floor(Math.min(ROOM.width / width, ROOM.height / height)));

  return { left, top, width, height, scale };
}

function drawOwners(context, job, view) {
  const { owners } = job.plan;
  const { width } = job.source;

  owners.forEach((owner, i) => {
    if (owner >= 0) {
      context.globalAlpha = owner === job.selected ? 0.7 : 0.4;
      context.fillStyle = partColour(owner);
      context.fillRect(
        (i % width) * view.scale,
        Math.floor(i / width) * view.scale,
        view.scale,
        view.scale,
      );
    }
  });
  context.globalAlpha = 1;
}

function drawPivots(context, job, view) {
  const pivots = pivotsOf(job.plan, job.source);

  context.lineWidth = 2;
  context.strokeStyle = cssVar('--ink');
  pivots.forEach((pivot, index) => {
    if (pivot) {
      const radius = index === job.selected ? 7 : 4.5;

      context.beginPath();
      context.arc(
        (pivot.x + 0.5) * view.scale,
        (pivot.y + 0.5) * view.scale,
        radius,
        0,
        Math.PI * 2,
      );
      context.fillStyle = index === job.selected ? partColour(index) : cssVar('--chrome-raised');
      context.fill();
      context.stroke();
    }
  });
}

export function drawCut(canvas, job) {
  const view = job.view;
  const { context } = sizeCanvas(canvas, view.width * view.scale, view.height * view.scale);

  drawChecker(context, { width: view.width * view.scale, height: view.height * view.scale }, 8);
  context.translate(-view.left * view.scale, -view.top * view.scale);
  drawSprite(context, job.source, view.scale);
  drawOwners(context, job, view);
  drawPivots(context, job, view);
  drawLasso(context, job);
}

// the art pixel under the pointer, or with `exact`, the point itself in art pixels
function pointOf(canvas, view, event, exact = false) {
  const box = canvas.getBoundingClientRect();
  const along = (offset) => (exact ? offset / view.scale : Math.floor(offset / view.scale));

  return [along(event.clientX - box.left) + view.left, along(event.clientY - box.top) + view.top];
}

// the part whose pivot is under the pointer, near enough to grab
function pivotUnder(job, [x, y]) {
  const reach = Math.max(1, 9 / job.view.scale);

  return pivotsOf(job.plan, job.source).findIndex(
    (pivot) => pivot && Math.hypot(pivot.x - x, pivot.y - y) <= reach,
  );
}

function brushAlong(job, from, to) {
  const index = job.erase ? -1 : job.selected;

  for (const [x, y] of linePoints(...from, ...to)) {
    paintOwners(job.plan, { source: job.source, point: [x, y], size: job.brush, index });
  }
}

function brushDrag(job, start) {
  let last = start;

  brushAlong(job, start, start);

  return {
    move(point) {
      brushAlong(job, last, point);
      last = point;
    },
  };
}

// a press drags a pivot when it is on one; otherwise it paints, or draws a lasso
function pressOn(job, canvas, event) {
  const at = (exact) => pointOf(canvas, job.view, event, exact);
  const pivot = pivotUnder(job, at(false));

  if (pivot >= 0) {
    job.selected = pivot;

    return {
      move: ([x, y]) => (job.plan.parts[pivot].pivot = { x, y }),
    };
  }

  return job.tool === 'lasso' ? lassoDrag(job, at(true)) : brushDrag(job, at(false));
}

export function cutCanvas(job, onChange) {
  const canvas = node('canvas.cut-canvas', { 'aria-label': 'The art, painted by part' });
  let drag = null;

  job.view = viewBox(job.source);
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    drag = pressOn(job, canvas, event);
    drawCut(canvas, job);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (drag) {
      drag.move(pointOf(canvas, job.view, event, Boolean(job.lasso)));
      drawCut(canvas, job);
    }
  });
  const letGo = () => {
    if (drag) {
      drag.end?.();
      drag = null;
      drawCut(canvas, job);
      onChange();
    }
  };

  canvas.addEventListener('pointerup', letGo);
  canvas.addEventListener('pointercancel', letGo);
  drawCut(canvas, job);

  return { canvas, redraw: () => drawCut(canvas, job) };
}
