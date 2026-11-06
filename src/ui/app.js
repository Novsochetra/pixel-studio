import { renderToolbar } from './toolbar.js';
import { renderRail } from './rail.js';
import { fitZoom, mountEditStage } from './edit-stage.js';
import { mountBoard } from './board.js';
import { mountPreview } from './preview/preview-stage.js';
import { mountInspector } from './inspector.js';
import { renderStatus } from './status-bar.js';
import { ROUTES } from './routes.js';
import { bindKeyboard } from './keyboard.js';
import { bindDrop } from './drop.js';
import { showQuickStart } from './quick-start.js';
import { currentLayer } from './actions.js';

const WORKSPACES = { edit: mountEditStage, board: mountBoard, game: mountPreview };

// the middle of the screen: one workspace at a time, mounted again when the workspace changes
function stageDrawer(element, app) {
  let stage = null;
  let shownMode = null;

  return (patch = {}) => {
    const { mode } = app.store.state;

    if (mode !== shownMode) {
      shownMode = mode;
      element.closest('.app').dataset.mode = mode;
      stage = WORKSPACES[mode](element, app);
    }

    stage.render(patch);
  };
}

function followResize(app, drawStage) {
  if (app.store.state.mode !== 'edit') {
    drawStage();
  } else if (app.store.state.zoom === app.fittedZoom) {
    app.fitCanvas();
  }
}

export function mountApp(app) {
  const stage = document.getElementById('stage');
  const draw = {
    toolbar: () => renderToolbar(document.getElementById('toolbar'), app),
    rail: () => renderRail(document.getElementById('rail'), app),
    stage: stageDrawer(stage, app),
    status: () => renderStatus(document.getElementById('statusbar'), app),
    ...mountInspector(app),
  };

  app.store.subscribe((_, patch) => {
    const keys = Object.keys(patch);

    for (const [part, triggers] of Object.entries(ROUTES)) {
      if (keys.some((key) => triggers.includes(key))) {
        draw[part](patch);
      }
    }
  });

  Object.values(draw).forEach((fn) => fn());
  // the zoom that fills the window; a resize follows it unless another zoom was chosen
  app.fitCanvas = () => {
    app.fittedZoom = fitZoom(stage, currentLayer(app.store.state).sprite);
    app.store.set({ zoom: app.fittedZoom });
  };
  app.fitCanvas();
  bindKeyboard(app);
  bindDrop(stage, app);
  showQuickStart(document.body);
  window.addEventListener('resize', () => followResize(app, draw.stage));
}
