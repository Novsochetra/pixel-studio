// A finger on the stage beside the canvas is half a pinch too: with another on the art, or
// beside it, the canvas pans and zooms as it does under two fingers on the art. Alone it does
// nothing: no tool acts off the art.
export function bindBeside(view, { place, press, finish }) {
  const { stage, canvas, touches } = view;
  const beside = (event) => event.pointerType === 'touch' && event.target !== canvas;

  stage.addEventListener('pointerdown', (event) => {
    if (!beside(event)) {
      return;
    }

    place(event);

    if (touches.size > 1) {
      press(event);
    }
  });
  stage.addEventListener('pointermove', (event) => {
    if (beside(event) && touches.has(event.pointerId)) {
      place(event);

      if (touches.size > 1) {
        view.session?.move?.();
      }
    }
  });

  for (const kind of ['pointerup', 'pointercancel']) {
    stage.addEventListener(kind, (event) => {
      if (beside(event) && touches.has(event.pointerId)) {
        finish(event);
      }
    });
  }
}
