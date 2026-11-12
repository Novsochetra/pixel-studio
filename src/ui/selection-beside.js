// the card and the room it keeps from the stage's edge and from the art
const CARD_ROOM_PX = 192;
// a window this tall keeps a band above the canvas for the bar (40-stage.css)
const BANDED_FROM_PX = 800;

// Whether the selection's bar stands beside the canvas, as a card in the stage's corner: where
// there is no band above the canvas for it, and room at the canvas's side. At the canvas's end
// it lay over the art's last rows, on a laptop and on a phone held on its side.
export function standsBeside(layout) {
  const stage = document.getElementById('stage');
  const art = stage?.querySelector('.canvas-holder');
  const banded = layout !== 'compact' && window.innerHeight >= BANDED_FROM_PX;

  if (!art || banded) {
    return false;
  }

  return art.getBoundingClientRect().left - stage.getBoundingClientRect().left >= CARD_ROOM_PX;
}
