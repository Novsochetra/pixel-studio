import { cssVar } from './draw.js';
import { angleOf, tidyAngle } from '../model/body/handle.js';

export const HANDLE_GAP = 14;

const HANDLE_REACH = 10;
const SNAP = 15;

// where the pointer is in art pixels, not rounded to one
function exactPoint(event, zoom) {
  const canvas = event?.target;

  if (!canvas?.matches?.('canvas')) {
    return null;
  }

  const box = canvas.getBoundingClientRect();

  return [(event.clientX - box.left) / zoom, (event.clientY - box.top) / zoom];
}

// A press is on the handle when it is on the knob as it is drawn, a finger's width for a finger.
// Reckoned from the middle of the pixel pressed, a zoom of 1400% or more put the art's own top
// row within reach: a drag begun there turned the selection it was meant to move.
export function onKnob(handle, [x, y], zoom, event = null) {
  if (!handle) {
    return false;
  }

  const exact = exactPoint(event, zoom);
  const [atX, atY] = exact ?? [x + 0.5, y + 0.5];
  const finger = event?.pointerType === 'touch' ? HANDLE_GAP : HANDLE_REACH;
  const reach = exact ? finger / zoom : Math.max(1.5, HANDLE_REACH / zoom);

  return Math.hypot(atX - handle.knob[0], atY - handle.knob[1]) <= reach;
}

export function dragAngle(turn, start) {
  const towards = ([x, y]) => angleOf([turn.centre.x, turn.centre.y], [x + 0.5, y + 0.5]);
  const from = towards(start);

  return (point, event) =>
    tidyAngle(turn.angle + towards(point) - from, event?.shiftKey ? SNAP : 1);
}

export function drawHandle(context, handle, scale) {
  const [from, to] = [handle.root, handle.knob].map(([x, y]) => [x * scale, y * scale]);

  context.save();
  context.lineWidth = 2;
  context.strokeStyle = cssVar('--tint');
  context.beginPath();
  context.moveTo(...from);
  context.lineTo(...to);
  context.stroke();
  context.beginPath();
  context.arc(...to, 7, 0, Math.PI * 2);
  context.fillStyle = cssVar('--tint');
  context.fill();
  context.strokeStyle = cssVar('--ink');
  context.stroke();
  context.restore();
}
