import { h, replace } from './dom.js';
import { renderToolbar } from './toolbar.js';
import { renderRail } from './rail.js';
import { fitZoom, mountEditStage } from './edit-stage.js';
import { mountBoard } from './board.js';
import { mountGamePreview } from './game-preview.js';
import { renderViewsPanel } from './views-panel.js';
import { renderColourPanel, renderDrawingPanel } from './colour-panel.js';
import { renderGuidesPanel } from './guides-panel.js';
import { renderAnimationPanel } from './animation-panel.js';
import { renderLayersPanel } from './layers-panel.js';
import { renderOutlinePanel } from './outline-panel.js';
import { bindKeyboard } from './keyboard.js';
import { bindDrop } from './drop.js';
import { showQuickStart } from './quick-start.js';
import { currentFrames, currentLayer, directionSprite } from './actions.js';
import { directionLabel } from '../model/project.js';
import { bounds, colorCounts } from '../model/sprite.js';

// which parts of the screen each kind of change redraws
const ROUTES = {
  toolbar: ['mode', 'zoom', 'showGrid', 'saveStatus', 'storage', 'pixels', 'project', 'viewFilter'],
  rail: ['tool', 'symmetry', 'mode'],
  stage: ['frameDrag', 'swapPreview', 'background', 'showPins', 'pinName', 'tool', 'highlight', 'viewFilter', 'markup', 'markupMode', 'mode', 'zoom', 'pixels', 'stroke', 'overlay', 'showGrid', 'showGuides', 'symmetry', 'mirror', 'at', 'preview', 'guides', 'game', 'project', 'onion', 'selection', 'frames', 'layers', 'animations'],
  views: ['at', 'mode', 'pixels', 'project', 'frames', 'layers', 'animations'],
  animation: ['at', 'project', 'animations', 'frames'],
  layers: ['at', 'project', 'layers', 'pixels', 'frames', 'animations'],
  colours: ['color', 'paintOver', 'paletteLock', 'cleanLines', 'symmetry', 'pixels', 'project', 'tool', 'at', 'frames', 'layers', 'animations'],
  drawing: ['paintOver', 'paletteLock', 'cleanLines', 'symmetry', 'pixels', 'project', 'at', 'frames', 'layers', 'animations'],
  guides: ['guides', 'pixels', 'showGuides', 'project', 'at', 'frames', 'layers', 'animations'],
  outline: ['outline', 'pixels', 'at', 'project', 'layers'],
  status: ['cursor', 'at', 'zoom', 'pixels', 'project', 'tool'],
};

function renderStatus(el, app) {
  const { state } = app.store;
  const sprite = directionSprite(state, state.at.direction);
  const box = bounds(sprite);
  const cursor = state.cursor;

  replace(
    el,
    h('span', {}, `${directionLabel(state.at.direction)} · frame ${Math.min(state.at.frame, currentFrames(state).length - 1) + 1} of ${currentFrames(state).length} · ${currentLayer(state).name}`),
    h('span', {}, `${sprite.width}×${sprite.height} canvas`),
    h('span', {}, box ? `sprite ${box.right - box.left}×${box.bottom - box.top}, rows ${box.top}–${box.bottom - 1}` : 'empty'),
    h('span', {}, `${colorCounts(sprite).length} colours`),
    h('span', {}, cursor ? `x ${cursor.x}, y ${cursor.y} · ${cursor.color}` : ''),
    h('span.status-help', {}, 'Press ? for shortcuts'),
  );
}

const FOLDED = 'pixel-clean-folded';
// what is used on every visit stays open; the rest waits one click away
const FOLDED_AT_FIRST = ['layers', 'animation', 'outline', 'guides'];

function readFolded() {
  try {
    const saved = localStorage.getItem(FOLDED);

    return saved === null ? FOLDED_AT_FIRST : JSON.parse(saved);
  } catch {
    return FOLDED_AT_FIRST;
  }
}

// a click on a section's title folds it away; which are folded is remembered in this browser
function bindCollapsing(inspector, sections) {
  const folded = new Set(readFolded());

  for (const [name, section] of Object.entries(sections)) {
    section.dataset.name = name;
    section.dataset.collapsed = String(folded.has(name));
  }

  const toggle = (title) => {
    const section = title.parentElement;
    const now = section.dataset.collapsed !== 'true';
    section.dataset.collapsed = String(now);
    now ? folded.add(section.dataset.name) : folded.delete(section.dataset.name);

    try {
      localStorage.setItem(FOLDED, JSON.stringify([...folded]));
    } catch {
      // nothing to remember it in: it stays folded for this visit
    }
  };

  inspector.addEventListener('click', (event) => {
    const title = event.target.closest('.section > h2');

    if (title && !event.target.closest('input, button, label, select')) {
      toggle(title);
    }
  });
  inspector.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.section > h2')) {
      event.preventDefault();
      toggle(event.target);
    }
  });
}

export function mountApp(app) {
  const parts = {
    toolbar: document.getElementById('toolbar'),
    rail: document.getElementById('rail'),
    stage: document.getElementById('stage'),
    status: document.getElementById('statusbar'),
  };
  const inspector = document.getElementById('inspector');
  const sections = {
    views: h('section.section'),
    colours: h('section.section'),
    drawing: h('section.section'),
    layers: h('section.section'),
    animation: h('section.section'),
    outline: h('section.section'),
    guides: h('section.section'),
  };
  inspector.replaceChildren(...Object.values(sections));
  bindCollapsing(inspector, sections);
  let stage = null;
  let stageMode = null;

  const draw = {
    toolbar: () => renderToolbar(parts.toolbar, app),
    rail: () => renderRail(parts.rail, app),
    stage: (patch = {}) => {
      const { mode } = app.store.state;

      if (mode !== stageMode) {
        stageMode = mode;
        document.getElementById('app').dataset.mode = mode;
        stage = { edit: mountEditStage, board: mountBoard, game: mountGamePreview }[mode](parts.stage, app);
      }

      stage.render(patch);
    },
    animation: () => renderAnimationPanel(sections.animation, app),
    views: () => renderViewsPanel(sections.views, app),
    layers: () => renderLayersPanel(sections.layers, app),
    colours: () => renderColourPanel(sections.colours, app),
    drawing: () => renderDrawingPanel(sections.drawing, app),
    outline: () => renderOutlinePanel(sections.outline, app),
    guides: () => renderGuidesPanel(sections.guides, app),
    status: () => renderStatus(parts.status, app),
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
  // the zoom that fills the window; a resize follows it unless you chose another zoom
  app.fitCanvas = () => {
    if (app.store.state.mode === 'edit') {
      app.fittedZoom = fitZoom(stage.area, currentLayer(app.store.state).sprite);
      app.store.set({ zoom: app.fittedZoom });
    }
  };
  app.fitCanvas();
  bindKeyboard(app);
  bindDrop(parts.stage, app);
  showQuickStart(document.body);
  window.addEventListener('resize', () => {
    if (app.store.state.mode !== 'edit') {
      draw.stage();
    } else if (app.store.state.zoom === app.fittedZoom) {
      app.fitCanvas();
    }
  });
}
