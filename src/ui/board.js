import { h, replace } from './dom.js';
import { changeStructure, directionSprite, directionsInUse, selectDirection } from './actions.js';
import { GAP, boardCanvas, boardPoint } from './board-canvas.js';
import { directionLabel } from '../model/project.js';
import { checkGuide, describeCheck } from '../views/guides.js';
function boardControls(app, note) {
  const { state } = app.store;
  const directions = directionsInUse(state);
  const setOverlay = (patch) => app.store.set({ overlay: { ...state.overlay, ...patch } });
  const clearMarks = () => {
    state.project.markup = { strokes: [], notes: [] };
    changeStructure(app, 'markup');
  };

  return h(
    'div',
    { style: { display: 'grid', gap: '10px', justifyItems: 'center' } },
    h(
      'div.group',
      { style: { gap: '10px', flexWrap: 'wrap', justifyContent: 'center' } },
      h('label.group', { for: 'overlay-direction', style: { gap: '6px' } }, 'See-through overlay', h('select.input', { id: 'overlay-direction', onchange: (event) => setOverlay({ direction: event.target.value || null }) }, h('option', { value: '' }, 'None'), directions.map((d) => h('option', { value: d, selected: state.overlay.direction === d }, directionLabel(d))))),
      h('input', { type: 'range', min: '0.1', max: '0.9', step: '0.05', value: String(state.overlay.opacity), 'aria-label': 'Overlay strength', id: 'overlay-opacity', onchange: (event) => setOverlay({ opacity: Number(event.target.value) }) }),
    ),
    h(
      'div.group',
      { style: { gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } },
      h('div.segmented', { role: 'group', 'aria-label': 'A click on the board' }, [
        ['edit', 'Opens the view'],
        ['pen', 'Draws a mark'],
        ['note', 'Adds a note'],
      ].map(([id, label]) => h('button', { 'aria-pressed': String((state.markupMode ?? 'edit') === id), onclick: () => app.store.set({ markupMode: id }) }, label))),
      state.markupMode === 'note' ? note : null,
      h('button.btn.quiet', { onclick: clearMarks }, 'Clear marks'),
    ),
  );
}

function guideSummary(state) {
  const lines = state.project.guides
    .filter((guide) => guide.rule !== 'fixed')
    .map((guide) =>
      h('div.guide-checks', {}, h('span.chip', {}, guide.name), directionsInUse(state).map((direction) => {
        const sprite = directionSprite(state, direction);
        const check = sprite ? checkGuide(sprite, guide) : { state: 'missing' };

        return h('span.chip', { 'data-state': check.state }, `${directionLabel(direction)}: ${describeCheck(check)}`);
      })),
    );

  return h('div', { style: { display: 'grid', gap: '6px', justifyItems: 'center' } }, lines);
}

function bindBoardPointer(app, canvas, scale) {
  const { state } = app.store;
  let stroke = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = boardPoint(state, scale, canvas, event);
    const mode = state.markupMode ?? 'edit';

    if (!point) {
      return;
    }

    state.project.markup ??= { strokes: [], notes: [] };

    if (mode === 'edit') {
      selectDirection(app, point.direction);
      app.store.set({ mode: 'edit' });
    } else if (mode === 'note') {
      state.project.markup.notes.push({ direction: point.direction, x: point.x, y: point.y, text: app.noteText || 'Fix this' });
      changeStructure(app, 'markup');
    } else {
      canvas.setPointerCapture(event.pointerId);
      stroke = { direction: point.direction, points: [[point.x, point.y]] };
      state.project.markup.strokes.push(stroke);
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = stroke && boardPoint(state, scale, canvas, event);

    if (point && point.direction === stroke.direction) {
      stroke.points.push([point.x, point.y]);
      app.store.touch('markup');
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (stroke) {
      stroke = null;
      changeStructure(app, 'markup');
    }
  });
}

export function mountBoard(container, app) {
  const holder = h('div');
  const inner = h('div.stage-inner', { style: { gap: '16px', alignContent: 'center' } });
  const note = h('input.input', { placeholder: 'Note text, then click the board', id: 'note-text', 'aria-label': 'Note text', value: app.noteText ?? '', oninput: (event) => { app.noteText = event.target.value; } });
  container.replaceChildren(inner);
  let shown = null;
  let shownScale = 0;

  return {
    render() {
      const { state } = app.store;
      const count = directionsInUse(state).length;
      const fit = Math.floor((container.clientWidth - 64 - (count - 1) * GAP) / (count * state.project.canvas.width));
      const scale = Math.max(1, Math.min(5, fit));
      const next = boardCanvas(state, scale);

      // repaint in place when the size holds, so a mark being drawn keeps its pointer
      if (shown && shown.width === next.width && shown.height === next.height && shownScale === scale) {
        shown.getContext('2d').drawImage(next, 0, 0);
      } else {
        shown = next;
        shownScale = scale;
        shown.style.touchAction = 'none';
        shown.style.maxWidth = '100%';
        bindBoardPointer(app, shown, scale);
        replace(holder, shown);
      }

      shown.style.cursor = (state.markupMode ?? 'edit') === 'edit' ? 'pointer' : 'crosshair';
      replace(inner, boardControls(app, note), holder, guideSummary(state));
    },
  };
}
