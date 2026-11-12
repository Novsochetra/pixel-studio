import { pinsOf, PIN_NAMES } from '../model/pins.js';
import { PIN_COLOURS, PIN_RING } from '../art/editor-colours.js';
import { labelPlaces } from './pin-labels.js';

// one fixed colour per body part, so a pin is the same colour in every frame
const colourOf = (name) => PIN_COLOURS[Math.max(0, PIN_NAMES.indexOf(name)) % PIN_COLOURS.length];
const centre = (mark, scale) => [(mark.x + 0.5) * scale, (mark.y + 0.5) * scale];

// each name in its pin's colour, edged in the ring's: bare, yellow on skin could not be read
function drawNames(context, dots) {
  context.lineJoin = 'round';
  context.lineWidth = 3;
  context.strokeStyle = PIN_RING;

  for (const label of labelPlaces(dots, (name) => context.measureText(name).width)) {
    context.fillStyle = dots.find((dot) => dot.name === label.name).colour;
    context.strokeText(label.name, label.x, label.y);
    context.fillText(label.name, label.x, label.y);
  }
}

// This frame's pins, and a faded trail from where the previous frame had them.
export function drawPins(context, frame, previous, scale) {
  const radius = Math.max(3, scale * 0.7);

  context.save();
  context.lineWidth = 2;

  for (const mark of pinsOf(previous)) {
    const now = pinsOf(frame).find((pin) => pin.name === mark.name);
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

  const dots = pinsOf(frame).map((mark) => {
    const [x, y] = centre(mark, scale);

    return { name: mark.name.toUpperCase(), colour: colourOf(mark.name), x, y, radius };
  });

  // the names first: a pin beside another is drawn over that one's name, never under it
  drawNames(context, dots);
  context.lineWidth = 2;

  for (const dot of dots) {
    context.fillStyle = dot.colour;
    context.beginPath();
    context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  context.restore();
}
