// Pins mark where body parts are in each frame, so an animation's motion can be kept even:
// frame.marks = [{ name, x, y }].
export const PIN_NAMES = ['Head', 'Hand', 'Hip', 'Left foot', 'Right foot', 'Ball'];

export function setPin(frame, name, x, y) {
  frame.marks = (frame.marks ?? []).filter((mark) => mark.name !== name).concat([{ name, x, y }]);
}

export function removePin(frame, name) {
  frame.marks = (frame.marks ?? []).filter((mark) => mark.name !== name);
}

export function pinsOf(frame) {
  return frame?.marks ?? [];
}

// the pin closest to a point, within a few pixels, goes
export function removePinNear(frame, [x, y], reach = 4) {
  const near = pinsOf(frame)
    .map((mark) => ({ mark, distance: Math.hypot(mark.x - x, mark.y - y) }))
    .filter((entry) => entry.distance <= reach)
    .sort((a, b) => a.distance - b.distance)[0];

  if (near) {
    removePin(frame, near.mark.name);
  }
}
