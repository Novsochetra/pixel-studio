import { CLEAR, getPixel } from '../model/sprite.js';
import { frameAt } from '../model/project.js';
import { removePinNear, setPin } from '../model/pins.js';
import { currentLayer, restructure } from './actions.js';
import { toast } from './dom.js';
import { fill, replace, shade, stroke } from './tools-paint.js';
import { select, wand } from './tools-select.js';
import { moveFrameDrag } from './frame-move.js';
import { kindOf } from '../model/kinds.js';

const TOOLS = [
  { id: 'pencil', label: 'Pencil', key: 'b' },
  { id: 'eraser', label: 'Eraser', key: 'e' },
  { id: 'picker', label: 'Colour picker', key: 'i' },
  { id: 'fill', label: 'Fill', key: 'g' },
  { id: 'replace', label: 'Replace colour', key: 'r' },
  { id: 'shade', label: 'Light and dark brush (Shift: darker)', key: 'd' },
  { id: 'select', label: 'Select and move', key: 's' },
  { id: 'wand', label: 'Select a colour (Shift: everywhere)', key: 'w' },
  { id: 'pin', label: 'Pin a body part (Alt-click removes it)', key: 'p' },
  { id: 'moveframe', label: 'Move the whole frame: drag it, or use the arrow keys', key: 'v' },
];

function pick(app, [x, y]) {
  const color = getPixel(currentLayer(app.store.state).sprite, x, y);

  if (color !== CLEAR) {
    app.store.set({
      color,
      tool: app.store.state.tool === 'picker' ? 'pencil' : app.store.state.tool,
    });
  }

  return null;
}

function pin(app, [x, y]) {
  const name = app.store.state.pinName;
  restructure(app, `Pin ${name}`, (state) => {
    setPin(frameAt(state.project, state.at), name, x, y);
  });
  app.store.set({ showPins: true });

  return null;
}

// pins mark body parts, on what stands on its feet; tiles, effects and icons have none
export function toolsFor(project) {
  return TOOLS.filter((tool) => tool.id !== 'pin' || kindOf(project).place === 'feet');
}

const PAINTING = new Set(['pencil', 'eraser', 'fill', 'replace', 'shade']);

// the tools a press starts; each returns the drag that follows, or null
const ON_PRESS = {
  select,
  wand: (app, point, event) => wand(app, point, event.shiftKey),
  pin,
  moveframe: moveFrameDrag,
  shade: (app, point, event) => shade(app, point, event.shiftKey),
  pencil: (app, point) => stroke(app, point, app.store.state.color),
  eraser: (app, point) => stroke(app, point, CLEAR),
  fill,
  replace,
};

function hiddenLayer(app) {
  const layer = currentLayer(app.store.state);
  toast(`${layer.name} is hidden, so you would not see what you draw. Show it in Layers first.`);

  return null;
}

export function startTool(app, point, event) {
  const { tool } = app.store.state;

  if (tool === 'pin' && event.altKey) {
    restructure(app, 'Remove pin', (state) =>
      removePinNear(frameAt(state.project, state.at), point),
    );

    return null;
  }

  if (event.altKey || tool === 'picker') {
    return pick(app, point);
  }

  if (PAINTING.has(tool) && !currentLayer(app.store.state).visible) {
    return hiddenLayer(app);
  }

  return ON_PRESS[tool](app, point, event);
}
