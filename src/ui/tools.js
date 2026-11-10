import { CLEAR, getPixel } from '../model/sprite.js';
import { frameAt } from '../model/project.js';
import { removePinNear, setPin } from '../model/pins.js';
import { currentLayer, restructure } from './actions.js';
import { toast } from './dom.js';
import { fill, replace, shade, stroke } from './tools-paint.js';
import { lasso, select, wand } from './tools-select.js';
import { onTurnHandle, turnSelectionDrag } from './selection-turn.js';
import { pickLayerToDrag } from './pick-layer.js';
import { moveFrameDrag } from './frame-move.js';
import { moveLayerDrag } from './layer-move.js';
import { onLayersHandle, turnLayersDrag } from './layer-turn.js';
import { kindOf } from '../model/kinds.js';
import { isPosedBody } from '../model/body/body-kind.js';
import { startOnPart } from './body/part-draw.js';
import { poseTool } from './body/pose-tool.js';

const TOOLS = [
  { id: 'pencil', label: 'Pencil', key: 'b' },
  { id: 'eraser', label: 'Eraser', key: 'e' },
  { id: 'picker', label: 'Colour picker', key: 'i' },
  { id: 'fill', label: 'Fill', key: 'g' },
  { id: 'replace', label: 'Replace colour', key: 'r' },
  { id: 'shade', label: 'Light and dark brush (Shift: darker)', key: 'd' },
  { id: 'select', label: 'Select and move: a click on art turns on Move for its layer', key: 's' },
  { id: 'wand', label: 'Select a colour (Shift: everywhere)', key: 'w' },
  {
    id: 'lasso',
    label:
      'Lasso: draw round a part to select it, drag inside to move it (Shift: add, Alt: take away)',
    key: 'l',
  },
  { id: 'pin', label: 'Pin a body part (Alt-click removes it)', key: 'p' },
  {
    id: 'move',
    label:
      'Move: drag art to move its layer, empty canvas to move the whole frame, the handle to turn. Arrow keys too',
    key: 't',
  },
  { id: 'pose', label: 'Pose the body parts: drag a part, or its handle to turn it', key: 'o' },
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

  restructure(app, `Pin ${name}`, (draft) => {
    setPin(frameAt(draft.project, draft.at), name, x, y);
  });
  app.store.set({ showPins: true });

  return null;
}

// pins and body parts are for what stands on its feet; tiles, effects and icons have none
const STANDING_ONLY = new Set(['pin', 'pose']);

export function toolsFor(project) {
  return TOOLS.filter((tool) => !STANDING_ONLY.has(tool.id) || kindOf(project).place === 'feet');
}

const PAINTING = new Set(['pencil', 'eraser', 'fill', 'replace', 'shade']);

const orTurnHandle = (tool) => (app, point, event) =>
  onTurnHandle(app, point) ? turnSelectionDrag(app, point) : tool(app, point, event);

function moveTool(app, point) {
  if (onLayersHandle(app, point)) {
    return turnLayersDrag(app, point);
  }

  return pickLayerToDrag(app, point) ? moveLayerDrag(app, point) : moveFrameDrag(app, point);
}

// the tools a press starts; each returns the drag that follows, or null
const ON_PRESS = {
  select: orTurnHandle(select),
  wand: orTurnHandle((app, point, event) => wand(app, point, event.shiftKey)),
  pin,
  move: orTurnHandle(moveTool),
  shade: (app, point, event) => shade(app, point, event.shiftKey),
  pencil: (app, point) => stroke(app, point, app.store.state.color),
  eraser: (app, point) => stroke(app, point, CLEAR),
  fill,
  replace,
  pose: poseTool,
  lasso: orTurnHandle(lasso),
};

function hiddenLayer(app) {
  const layer = currentLayer(app.store.state);

  toast(`${layer.name} is hidden, so you would not see what you draw. Show it in Layers first.`);

  return null;
}

export function startTool(app, point, event) {
  const { tool } = app.store.state;

  if (tool === 'pin' && event.altKey) {
    restructure(app, 'Remove pin', (draft) =>
      removePinNear(frameAt(draft.project, draft.at), point),
    );

    return null;
  }

  // the lasso takes Alt to take pixels away, as image editors do
  if ((event.altKey && tool !== 'lasso') || tool === 'picker') {
    return pick(app, point);
  }

  if (PAINTING.has(tool) && !currentLayer(app.store.state).visible) {
    return hiddenLayer(app);
  }

  if (PAINTING.has(tool) && isPosedBody(currentLayer(app.store.state))) {
    return startOnPart(app, point);
  }

  return ON_PRESS[tool](app, point, event);
}
