// A finger that lands may be the first of two, so what it would start waits a moment: until it
// moves, lifts, or has stayed put this long. A second finger in that time makes it a pinch, and
// the tool in hand (a fill, a pin) never acts.
const HOLD_MS = 160;
const SLOP_PX = 6;

export function touchIntent(event, start) {
  let waiting = true;
  const begin = () => {
    if (waiting) {
      waiting = false;
      clearTimeout(timer);
      start();
    }
  };
  const timer = setTimeout(begin, HOLD_MS);

  return {
    begin,
    moved(moveEvent) {
      const far = Math.hypot(moveEvent.clientX - event.clientX, moveEvent.clientY - event.clientY);

      if (far >= SLOP_PX) {
        begin();
      }
    },
    drop() {
      waiting = false;
      clearTimeout(timer);
    },
  };
}
