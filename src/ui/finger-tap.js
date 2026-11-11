const TAP_MS = 300;
const SLOP_PX = 10;

// Fingers set down and lifted together, without moving: a tap of two or three, as drawing apps
// on a phone have for undo and redo. A drag, a hold, or a touch the browser took away is none.
export function fingerTap() {
  const down = new Map();
  let began = 0;
  let most = 0;
  let still = true;

  return {
    // a finger lands, or moves
    at({ pointerId, clientX: x, clientY: y, timeStamp }) {
      const from = down.get(pointerId);

      if (from) {
        still &&= Math.hypot(x - from.x, y - from.y) < SLOP_PX;

        return;
      }

      if (!down.size) {
        began = timeStamp;
        most = 0;
        still = true;
      }

      down.set(pointerId, { x, y });
      most = Math.max(most, down.size);
    },

    // how many tapped, said once as the last of them lifts; 0 while one is still down
    lifted({ pointerId, timeStamp, type }) {
      down.delete(pointerId);
      still &&= type === 'pointerup';

      if (down.size) {
        return 0;
      }

      const tapped = still && timeStamp - began < TAP_MS ? most : 0;

      most = 0;

      return tapped;
    },
  };
}
