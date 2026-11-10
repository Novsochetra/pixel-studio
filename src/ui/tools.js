import { CLEAR, getPixel } from '../model/sprite.js';
import { frameAt } from '../model/project.js';
import { removePinNear, setPin } from '../model/pins.js';
import { currentLayer, restructure } from './actions.js';
import { toast } from './dom.js';
import { PAINTING, fill, replace, shade, stroke } from './tools-paint.js';
import { shape } from './tools-shape.js';
import { lasso, select, wand } from './tools-select.js';
import { onTurnHandle, turnSelectionDrag } from './selection-turn.js';
import { pickLayerToDrag } from './pick-layer.js';
import { moveFrameDrag } from './frame-move.js';
import { moveLayerDrag } from './layer-move.js';
import { kindOf } from '../model/kinds.js';
import { isPosedBody } from '../model/body/body-kind.js';
import { startOnPart } from './body/part-draw.js';
import { poseTool } from './body/pose-tool.js';

const TOOLS = [
  { id: 'pencil', label: 'Pencil', key: 'b' },
  { id: 'eraser', label: 'Eraser', key: 'e' },
  { id: 'picker', label: 'Colour picker', key: 'i' },
  { id: 'fill', label: 'Fill', key: 'g' },
  { id: 'line', label: 'Line: drag from end to end (Shift: straight or diagonal)', key: 'n' },
  { id: 'rect', label: 'Rectangle: drag corner to corner (Shift: a square)', key: 'u' },
  { id: 'ellipse', label: 'Ellipse: drag corner to corner (Shift: a circle)', key: 'c' },
  { id: 'replace', label: 'Replace colour', key: 'r' },
  { id: 'shade', label: 'Light and dark brush (Shift: darker)', key: 'd' },
  { id: 'select', label: 'Select and move: a click picks the layer under it', key: 's' },
  { id: 'wand', label: 'Select a colour (Shift: everywhere)', key: 'w' },
  {
    id: 'lasso',
    label:
      'Lasso: draw round a part to select it, drag inside to move it (Shift: add, Alt: take away)',
    key: 'l',
  },
  { id: 'pin', label: 'Pin a body part (Alt-click removes it)', key: 'p' },
  { id: 'movelayer', label: 'Move this layer: drag it, or use the arrow keys', key: 't' },
  { id: 'moveframe', label: 'Move the whole frame: drag it, or use the arrow keys', key: 'v' },
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

const orTurnHandle = (tool) => (app, point, event) =>
  onTurnHandle(app, point) ? turnSelectionDrag(app, point) : tool(app, point, event);

// the tools a press starts; each returns the drag that follows, or null
const ON_PRESS = {
  select: orTurnHandle(select),
  wand: orTurnHandle((app, point, event) => wand(app, point, event.shiftKey)),
  pin,
  movelayer(app, point) {
    pickLayerToDrag(app, point);

    return moveLayerDrag(app, point);
  },
  moveframe: moveFrameDrag,
  shade: (app, point, event) => shade(app, point, event.shiftKey),
  pencil: (app, point) => stroke(app, point, app.store.state.color),
  eraser: (app, point) => stroke(app, point, CLEAR),
  fill,
  replace,
  line: (app, point) => shape(app, 'line', point),
  rect: (app, point) => shape(app, 'rect', point),
  ellipse: (app, point) => shape(app, 'ellipse', point),
  pose: poseTool,
  lasso: orTurnHandle(lasso),
};

// Why a tool that puts pixels down cannot draw on the layer in hand, said to the person; null
// when it can. What is drawn on a picture to trace never reaches a download: work lost unseen.
function cannotPaint(tool, layer) {
  if (!layer.visible) {
    return `${layer.name} is hidden, so you would not see what you draw. Show it in Layers first.`;
  }

  if (layer.kind === 'reference' && tool !== 'eraser') {
    return `${layer.name} is a picture to trace, so it is not drawn on. Pick a layer of art in Layers.`;
  }

  return null;
}

function startPainting(app, point, event) {
  const { tool } = app.store.state;
  const layer = currentLayer(app.store.state);
  const refused = cannotPaint(tool, layer);

  if (refused) {
    toast(refused);

    return null;
  }

  return isPosedBody(layer) ? startOnPart(app, point) : ON_PRESS[tool](app, point, event);
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

  return PAINTING.has(tool) ? startPainting(app, point, event) : ON_PRESS[tool](app, point, event);
}
