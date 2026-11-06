import { node, replace } from './dom.js';
import { renderToolbar } from './toolbar.js';
import { renderRail } from './rail.js';
import { fitZoom, mountEditStage } from './edit-stage.js';
import { mountBoard } from './board.js';
import { mountGamePreview } from './game-preview.js';
import { renderViewsPanel } from './views-panel.js';
import { renderColourPanel } from './colour-panel.js';
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
  stage: [
    'swapPreview',
    'background',
    'showPins',
    'pinName',
    'tool',
    'highlight',
    'viewFilter',
    'markup',
    'markupMode',
    'mode',
    'zoom',
    'pixels',
    'stroke',
    'overlay',
    'showGrid',
    'showGuides',
    'symmetry',
    'mirror',
    'at',
    'preview',
    'guides',
    'game',
    'project',
    'onion',
    'selection',
    'frames',
    'layers',
    'animations',
  ],
  views: ['at', 'mode', 'pixels', 'project', 'frames', 'layers', 'animations'],
  animation: ['at', 'project', 'animations', 'frames'],
  layers: ['at', 'project', 'layers', 'pixels', 'frames', 'animations'],
  colours: [
    'color',
    'paintOver',
    'paletteLock',
    'cleanLines',
    'symmetry',
    'pixels',
    'project',
    'tool',
    'at',
    'frames',
    'layers',
    'animations',
  ],
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
    node(
      'span',
      {},
      `${directionLabel(state.at.direction)} · frame ${Math.min(state.at.frame, currentFrames(state).length - 1) + 1} of ${currentFrames(state).length} · ${currentLayer(state).name}`,
    ),
    node('span', {}, `${sprite.width}×${sprite.height} canvas`),
    node(
      'span',
      {},
      box
        ? `sprite ${box.right - box.left}×${box.bottom - box.top}, rows ${box.top}–${box.bottom - 1}`
        : 'empty',
    ),
    node('span', {}, `${colorCounts(sprite).length} colours`),
    node('span', {}, cursor ? `x ${cursor.x}, y ${cursor.y} · ${cursor.color}` : ''),
    node(
      'span',
      {},
      'Alt-click picks a colour · ⌘Z undo · B E I G R S W tools · M symmetry · , . frames · arrows nudge a selection',
    ),
  );
}

const FOLDED = 'pixel-clean-folded';

function readFolded() {
  try {
    return JSON.parse(localStorage.getItem(FOLDED) ?? '[]');
  } catch {
    return [];
  }
}

// a click on a section's title folds it away; which are folded is remembered in this browser
function bindCollapsing(inspector, sections) {
  const folded = new Set(readFolded());

  for (const [name, section] of Object.entries(sections)) {
    section.dataset.name = name;
    section.dataset.collapsed = String(folded.has(name));
  }

  inspector.addEventListener('click', (event) => {
    const title = event.target.closest('.section > h2');

    if (!title || event.target.closest('input, button, label, select')) {
      return;
    }

    const section = title.parentElement;
    const now = section.dataset.collapsed !== 'true';
    section.dataset.collapsed = String(now);
    now ? folded.add(section.dataset.name) : folded.delete(section.dataset.name);

    try {
      localStorage.setItem(FOLDED, JSON.stringify([...folded]));
    } catch {
      // nothing to remember it in: it stays folded for this visit
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
    animation: node('section.section'),
    views: node('section.section'),
    layers: node('section.section'),
    colours: node('section.section'),
    outline: node('section.section'),
    guides: node('section.section'),
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
        stage = { edit: mountEditStage, board: mountBoard, game: mountGamePreview }[mode](
          parts.stage,
          app,
        );
      }

      stage.render(patch);
    },
    animation: () => renderAnimationPanel(sections.animation, app),
    views: () => renderViewsPanel(sections.views, app),
    layers: () => renderLayersPanel(sections.layers, app),
    colours: () => renderColourPanel(sections.colours, app),
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
  app.store.set({ zoom: fitZoom(parts.stage, currentLayer(app.store.state).sprite) });
  bindKeyboard(app);
  bindDrop(parts.stage, app);
  showQuickStart(document.body);
  window.addEventListener('resize', () => app.store.state.mode !== 'edit' && draw.stage());
}
