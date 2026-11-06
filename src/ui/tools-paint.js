import { CLEAR, cloneSprite, getPixel, setPixel } from '../model/sprite.js';
import { brushPixels, canPaint, floodFill, linePoints, replaceColor } from '../editor/paint.js';
import { shadeFamilies, shiftShade } from '../palette/families.js';
import { Stroke } from '../editor/stroke.js';
import { characterColors } from './character-colours.js';
import { commit, currentLayer } from './actions.js';
import { toast } from './dom.js';

export const BRUSH_TOOLS = new Set(['pencil', 'eraser', 'shade', 'pixels']);

// clean lines tidies drawn lines; for the eraser it would put erased corners back
export function paintOptions(state, color = state.color) {
  return {
    brush: state.brush,
    symmetry: state.symmetry,
    paintOver: state.paintOver,
    cleanLines: state.cleanLines && color !== CLEAR,
  };
}

export function stroke(app, point, color) {
  const layer = currentLayer(app.store.state);
  const line = new Stroke(layer.sprite, color, paintOptions(app.store.state, color));

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
      }
    },
  };
}

export function fill(app, [x, y]) {
  const layer = currentLayer(app.store.state);

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

  commit(app, 'Replace colour', [layer], () => {
    count = replaceColor(layer.sprite, from, state.color);
  });
  toast(count ? `Replaced ${count} pixels` : 'That pixel already has this colour');

  return null;
}

// each pixel the brush passes steps once along its shade family: lighter, or darker with Shift
export function shade(app, point, darker) {
  const { state } = app.store;
  const layer = currentLayer(state);
  const before = cloneSprite(layer.sprite);
  const families = shadeFamilies(characterColors(state));
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
    end() {
      if (app.history.record(darker ? 'Darken' : 'Lighten', [{ layer, before }])) {
        app.saver.markLayers([layer.id]);
        app.store.touch('pixels');
      }
    },
  };
}
