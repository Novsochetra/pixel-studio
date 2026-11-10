import { settleAt } from './actions.js';
import { keepSetting, readSetting } from './remembered.js';
import { toolsFor } from './tool-list.js';
import { isSingleView } from '../model/kinds.js';

const KEY = 'pixel-clean-view';
const WAIT_MS = 400;

// how the editor is showing things: the tools in hand and what is on show
export const VIEW = [
  'mode',
  'zoom',
  'tool',
  'color',
  'brush',
  'showGrid',
  'showGuides',
  'viewFilter',
  'onion',
  'gridAll',
  'gridOpen',
  'symmetry',
  'showPins',
  'pinName',
  'shapeFilled',
  'paletteLock',
  'paintOver',
  'cleanLines',
];

// The canvas is fitted afresh when a project opens, so the zoom it was left at is not kept; the
// frames being folded or showing every view is remembered for every project, where it is set.
const NOT_KEPT = new Set(['zoom', 'gridAll', 'gridOpen']);

// What of a view kept on an earlier visit still holds for the project as it is now: a tool or a
// workspace its kind has, and a frame it still has.
export function fittedView(project, view) {
  const known = Object.fromEntries(
    VIEW.filter((key) => key in view && !NOT_KEPT.has(key)).map((key) => [key, view[key]]),
  );
  const tools = toolsFor(project).map((tool) => tool.id);

  return {
    ...known,
    tool: tools.includes(view.tool) ? view.tool : 'pencil',
    mode: view.mode === 'board' && isSingleView(project) ? 'edit' : (view.mode ?? 'edit'),
    ...(view.at ? { at: settleAt({ project, at: view.at }) } : {}),
  };
}

// The view the project was left on, the last time this browser had it open. A page is loaded
// again more often than people ask it to be (a phone drops a tab it has not shown for a while):
// the work came back, but on its first view and frame, the pencil and the first colour.
export function keptView(project) {
  const kept = readSetting(KEY, null);

  try {
    return kept?.id === project.id ? fittedView(project, kept.view) : {};
  } catch {
    return {};
  }
}

export function watchView(app) {
  let timer = null;
  const keep = () => {
    const { state } = app.store;
    const view = Object.fromEntries(VIEW.map((key) => [key, state[key]]));

    keepSetting(KEY, { id: state.project.id, view: { ...view, at: state.at } });
  };

  app.store.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(keep, WAIT_MS);
  });
  // a page on its way out has no later: what it shows now is kept now
  addEventListener('pagehide', keep);
}
