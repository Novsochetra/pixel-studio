// A selection is an area of the canvas, so it stays as the frame or layer changes, as image
// editors keep it: select an arm once, then duplicate or step through frames to move it in each.
// Another view or animation is another drawing, where the area would mean nothing.
export function keptSelection(selection, { from, to, canvas }) {
  if (!selection) {
    return null;
  }

  const sameDrawing = from.animation === to.animation && from.direction === to.direction;
  const fits = selection.width === canvas.width && selection.height === canvas.height;

  if (!sameDrawing || !fits) {
    return null;
  }

  // what a pasted piece remembers lying under it belongs to the frame and layer it was pasted on
  const samePlace = from.frame === to.frame && from.layer === to.layer;
  const area = { width: selection.width, height: selection.height, cells: selection.cells };

  return samePlace || !selection.floating ? selection : area;
}
