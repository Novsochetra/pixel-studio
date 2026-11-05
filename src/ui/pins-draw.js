import { pinsOf, PIN_NAMES } from '../model/pins.js';

// one fixed colour per body part, so a pin is the same colour in every frame
const PIN_COLOURS = ['#ff375f', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#bf5af2'];
const colourOf = (name) => PIN_COLOURS[Math.max(0, PIN_NAMES.indexOf(name)) % PIN_COLOURS.length];
const centre = (mark, scale) => [(mark.x + 0.5) * scale, (mark.y + 0.5) * scale];

// This frame's pins, and a faded trail from where the previous frame had them.
export function drawPins(context, frame, previous, scale) {
  const radius = Math.max(3, scale * 0.7);
  context.save();
  context.lineWidth = 2;

  for (const mark of pinsOf(previous)) {
    const now = pinsOf(frame).find((m) => m.name === mark.name);
    const [px, py] = centre(mark, scale);
    context.globalAlpha = 0.45;
    context.strokeStyle = colourOf(mark.name);
    context.setLineDash([3, 3]);
    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);

    if (now) {
      context.moveTo(px, py);
      context.lineTo(...centre(now, scale));
    }

    context.stroke();
  }

  context.setLineDash([]);
  context.globalAlpha = 1;
  context.font = '700 10px Silkscreen, ui-monospace, monospace';

  for (const mark of pinsOf(frame)) {
    const [x, y] = centre(mark, scale);
    context.fillStyle = colourOf(mark.name);
    context.strokeStyle = '#000000';
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillText(mark.name.toUpperCase(), x + radius + 3, y + 3);
  }

  context.restore();
}
