import { CLEAR, getPixel } from '../model/sprite.js';
import { frameAt } from '../model/project.js';
import { removePinNear, setPin } from '../model/pins.js';
import { currentLayer, restructure } from './actions.js';
import { toast } from './dom.js';
import { fill, replace, shade, stroke } from './tools-paint.js';
import { select, wand } from './tools-select.js';
export const TOOLS = [
  { id: 'pencil', label: 'Pencil', key: 'b' },
  { id: 'eraser', label: 'Eraser', key: 'e' },
  { id: 'picker', label: 'Colour picker', key: 'i' },
  { id: 'fill', label: 'Fill', key: 'g' },
  { id: 'replace', label: 'Replace colour', key: 'r' },
  { id: 'shade', label: 'Light and dark brush (Shift: darker)', key: 'd' },
  { id: 'select', label: 'Select and move', key: 's' },
  { id: 'wand', label: 'Select a colour (Shift: everywhere)', key: 'w' },
  { id: 'pin', label: 'Pin a body part (Alt-click removes it)', key: 'p' },
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

const PAINTING = new Set(['pencil', 'eraser', 'fill', 'replace', 'shade']);

export function startTool(app, point, event) {
  const { tool, color } = app.store.state;

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
    toast(
      `${currentLayer(app.store.state).name} is hidden, so you would not see what you draw. Show it in Layers first.`,
    );

    return null;
  }

  if (tool === 'select') {
    return select(app, point);
  }

  if (tool === 'wand') {
    return wand(app, point, event.shiftKey);
  }

  if (tool === 'pin') {
    return pin(app, point, event.altKey);
  }

  if (tool === 'shade') {
    return shade(app, point, event.shiftKey);
  }

  if (tool === 'pencil' || tool === 'eraser') {
    return stroke(app, point, tool === 'eraser' ? CLEAR : color);
  }

  return tool === 'fill' ? fill(app, point) : replace(app, point);
}
