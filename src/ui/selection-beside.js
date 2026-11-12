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

// the share of the canvas's height the bar lies over, at whichever end it stands
const BAR_REACH = 0.15;

// On a phone the bar lies over one end of the canvas, by the thumb at its foot unless more of
// the selection is under it there than would be at the top: it never hides the pixels it acts
// on. Put at the top as soon as the selection passed the middle, it jumped away from the thumb
// with nothing under it.
export function barSide(box, canvas) {
  const reach = canvas.height * BAR_REACH;
  const underFoot = Math.max(0, box.bottom - (canvas.height - reach));
  const underTop = Math.max(0, reach - box.top);

  return underFoot > underTop ? 'top' : 'bottom';
}
