import { CLEAR, getPixel } from '../model/sprite.js';
import { frameAt } from '../model/project.js';
import { compositeFrame } from '../model/composite.js';
import { removePinNear, setPin } from '../model/pins.js';
import { currentLayer, restructure } from './actions.js';
import { toast } from './dom.js';
import { PAINTING, fill, onRelease, replace, shade, stroke } from './tools-paint.js';
import { shape } from './tools-shape.js';
import { lasso, select, wand } from './tools-select.js';
import { onTurnHandle, turnSelectionDrag } from './selection-turn.js';
import { pickLayerToDrag } from './pick-layer.js';
import { moveFrameDrag } from './frame-move.js';
import { moveLayerDrag } from './layer-move.js';
import { onLayersHandle, turnLayersDrag } from './layer-turn.js';
import { isPosedBody } from '../model/body/body-kind.js';
import { startOnPart } from './body/part-draw.js';
import { poseTool } from './body/pose-tool.js';

// the colour as it shows: the layer in hand's, or under a clear pixel of it the art's below
function pick(app, [x, y]) {
  const { state } = app.store;
  const { width, height } = state.project.canvas;
  const own = getPixel(currentLayer(state).sprite, x, y);
  const color =
    own === CLEAR
      ? getPixel(compositeFrame(frameAt(state.project, state.at), width, height), x, y)
      : own;

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

const orTurnHandle = (tool) => (app, point, event) =>
  onTurnHandle(app, point, event) ? turnSelectionDrag(app, point) : tool(app, point, event);

function moveTool(app, point, event) {
  if (onLayersHandle(app, point, event)) {
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
  shade: (app, point, event) => shade(app, point, event.shiftKey || app.store.state.shadeDarker),
  pencil: (app, point) => stroke(app, point, app.store.state.color),
  eraser: (app, point) => stroke(app, point, CLEAR),
  fill: onRelease(fill),
  replace: onRelease(replace),
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
