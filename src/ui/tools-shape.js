import { cloneSprite } from '../model/sprite.js';
import { paintPoint } from '../editor/paint.js';
import { heldTrue, shapePoints } from '../editor/shapes.js';
import { currentLayer } from './actions.js';
import { paintOptions } from './tools-paint.js';

const LABELS = { line: 'Line', rect: 'Rectangle', ellipse: 'Ellipse' };

// the inside of a filled shape is laid a pixel at a time: the brush only thickens an outline
const optionsFor = (state) =>
  state.shapeFilled
    ? { ...paintOptions(state), brush: { size: 1, shape: 'square' } }
    : paintOptions(state);

// A drag of the Line, Rectangle or Ellipse tool: the shape follows the pointer over the art as
// it was, and is kept as one step when the pointer lets go. Shift holds it true.
export function shape(app, kind, start) {
  const { state } = app.store;
  const layer = currentLayer(state);
  const before = cloneSprite(layer.sprite);
  const draw = (end, held) => {
    const to = held ? heldTrue(kind, start, end) : end;

    layer.sprite.pixels.set(before.pixels);

    for (const point of shapePoints(kind, start, to, { filled: state.shapeFilled })) {
      paintPoint(layer.sprite, point, state.color, optionsFor(state));
    }

    app.store.touch('stroke');
  };

  draw(start, false);

  return {
    move: (point, event) => draw(point, event.shiftKey),
    cancel() {
      layer.sprite.pixels.set(before.pixels);
      app.store.touch('stroke');
    },
    end() {
      if (app.history.record(LABELS[kind], [{ layer, before }])) {
        app.saver.markLayers([layer.id]);
        app.store.touch('pixels');
      }
    },
  };
}
