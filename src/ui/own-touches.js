// Chromium on a phone takes a finger lifted while still moving for a fling, and swallows the next
// tap as the one that stops it: Undo tapped right after a quick stroke did nothing. A touch on
// the canvas is the studio's alone, and says so.
export function ownTouches(canvas) {
  for (const kind of ['touchstart', 'touchmove']) {
    canvas.addEventListener(kind, (event) => event.preventDefault(), { passive: false });
  }
}
