import { CLEAR, cloneSprite, getPixel, setPixel, toHex } from '../model/sprite.js';
import { brushPixels, canPaint, floodFill, linePoints, replaceColor } from '../editor/paint.js';
import { shadeRamps, shiftShade } from '../palette/families.js';
import { Stroke } from '../editor/stroke.js';
import { topLayerAt } from '../model/layer-ops.js';
import { frameAt } from '../model/project.js';
import { characterColors } from './character-colours.js';
import { commit, currentLayer } from './actions.js';
import { toast } from './dom.js';

export const BRUSH_TOOLS = new Set(['pencil', 'eraser', 'shade', 'line', 'rect', 'ellipse']);

// the tools that put pixels on the layer being edited
export const PAINTING = new Set([...BRUSH_TOOLS, 'fill', 'replace']);

// clean lines tidies drawn lines; for the eraser it would put erased corners back
export function paintOptions(state, color = state.color) {
  return {
    brush: state.brush,
    symmetry: state.symmetry,
    paintOver: state.paintOver,
    cleanLines: state.cleanLines && color !== CLEAR,
  };
}

export const paintOverSaid = (state) =>
  `Paint only over is set to ${toHex(state.paintOver)}, so only that colour changes. Set it to "Any pixel" to paint the rest.`;

export function stroke(app, point, color) {
  const { state } = app.store;
  const layer = currentLayer(state);
  // a stroke begun on a colour "Paint only over" keeps, that draws nothing, says why at its end
  const kept = !canPaint(layer.sprite, ...point, state.paintOver);
  const line = new Stroke(layer.sprite, color, paintOptions(state, color));

  line.add(...point);
  app.store.touch('stroke');

  return {
    move(next) {
      line.add(...next);
      app.store.touch('stroke');
    },
    cancel() {
      layer.sprite.pixels.set(line.before.pixels);
      app.store.touch('stroke');
    },
    end() {
      if (
        app.history.record(color === CLEAR ? 'Erase' : 'Pencil', [{ layer, before: line.before }])
      ) {
        app.saver.markLayers([layer.id]);
        app.store.touch('pixels');
      } else if (kept) {
        toast(paintOverSaid(state));
      }
    },
  };
}

// "Paint only over" names one colour: a click on any other changes nothing, and says why
function keptByPaintOver(state, sprite, [x, y]) {
  if (canPaint(sprite, x, y, state.paintOver)) {
    return false;
  }

  toast(paintOverSaid(state));

  return true;
}

// Fill and Replace colour act as the pointer lets go: a press that turns out to be the first
// finger of a pinch is taken back with nothing filled.
export const onRelease = (act) => (app, point) => ({ end: () => act(app, point), cancel() {} });

export function fill(app, [x, y]) {
  const layer = currentLayer(app.store.state);

  if (keptByPaintOver(app.store.state, layer.sprite, [x, y])) {
    return null;
  }

  commit(app, 'Fill', [layer], () =>
    floodFill(layer.sprite, [x, y], app.store.state.color, paintOptions(app.store.state)),
  );

  return null;
}

export function replace(app, [x, y]) {
  const { state } = app.store;
  const layer = currentLayer(state);
  const from = getPixel(layer.sprite, x, y);
  let count = 0;

  if (from === CLEAR) {
    // what shows there may be another layer's: "a clear pixel" was not what the person saw
    const shown = topLayerAt(frameAt(state.project, state.at), [x, y]);

    toast(
      shown
        ? `That colour is on ${shown.name}, not on ${layer.name}: pick ${shown.name} in Layers to replace it.`
        : 'Pick the colour to replace on the canvas: there is none on a clear pixel.',
    );

    return null;
  }

  if (keptByPaintOver(state, layer.sprite, [x, y])) {
    return null;
  }

  commit(app, 'Replace colour', [layer], () => {
    count = replaceColor(layer.sprite, from, state.color, { paintOver: state.paintOver });
  });
  toast(count ? `Replaced ${count} pixels` : 'That pixel already has this colour');

  return null;
}

// each pixel the brush passes steps once along its shade family: lighter, or darker with Shift
export function shade(app, point, darker) {
  const { state } = app.store;
  const layer = currentLayer(state);
  const before = cloneSprite(layer.sprite);
  const families = shadeRamps(characterColors(state));
  const touched = new Set();
  let last = null;
  const step = ([x, y]) => {
    for (const [px, py] of last ? linePoints(last[0], last[1], x, y) : [[x, y]]) {
      for (const [mx, my] of brushPixels([px, py], state)) {
        const key = my * layer.sprite.width + mx;
        const color = getPixel(before, mx, my);

        if (!touched.has(key) && color !== CLEAR && canPaint(before, mx, my, state.paintOver)) {
          touched.add(key);
          setPixel(layer.sprite, mx, my, shiftShade(color, families, darker ? -1 : 1));
        }
      }
    }

    last = [x, y];
    app.store.touch('stroke');
  };

  step(point);

  return {
    move: step,
    cancel() {
      layer.sprite.pixels.set(before.pixels);
      app.store.touch('stroke');
    },
    end() {
      if (app.history.record(darker ? 'Darken' : 'Lighten', [{ layer, before }])) {
        app.saver.markLayers([layer.id]);
        app.store.touch('pixels');
      } else {
        // it steps along the art's own shades: with none to step to, it left no trace or word
        toast(
          `The art has no ${darker ? 'darker' : 'lighter'} shade of the colours under the brush to step to.`,
        );
      }
    },
  };
}
