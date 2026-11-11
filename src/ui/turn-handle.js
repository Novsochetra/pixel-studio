import { cssVar } from './draw.js';
import { angleOf, tidyAngle } from '../model/body/handle.js';

export const HANDLE_GAP = 14;

const HANDLE_REACH = 10;
const SNAP = 15;

export function onKnob(handle, [x, y], zoom) {
  const reach = Math.max(1.5, HANDLE_REACH / zoom);

  return Boolean(handle) && Math.hypot(x + 0.5 - handle.knob[0], y + 0.5 - handle.knob[1]) <= reach;
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
