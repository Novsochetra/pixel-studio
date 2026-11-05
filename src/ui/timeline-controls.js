import { h, icon } from './dom.js';
import { currentAnimation, restructure, shiftCurrentFrame } from './actions.js';
import { addFrame, frameCount, moveFrame, removeFrame } from '../model/frames.js';
import { copyFrameToViews } from '../model/structure.js';
import { directionLabel } from '../model/project.js';
import { PIN_NAMES } from '../model/pins.js';
import { chooseFile } from './views-panel.js';
import { openImport } from './import-sheet.js';

export function frameStructure(app, label, change) {
  restructure(app, label, (state) => ({ frame: change(state) }));
}

function deleteButton(app, index, count) {
  let confirming = false;

  return h('button.btn.quiet', {
    disabled: count < 2,
    title: 'Delete this frame from every view',
    onclick: (event) => {
      if (!confirming) {
        confirming = true;
        event.currentTarget.textContent = `Delete frame ${index + 1}? Click again`;

        return;
      }

      frameStructure(app, 'Delete frame', (s) => removeFrame(currentAnimation(s), index));
    },
  }, 'Delete');
}

// what changes the frames themselves: the same for every view
export function frameButtons(app, index) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const direction = state.at.direction;
  const count = frameCount(animation);
  const views = Object.keys(animation.directions).length;
  const move = (step) => frameStructure(app, 'Move frame', (s) => moveFrame(currentAnimation(s), index, index + step));

  return [
    h('button.btn.quiet', { title: 'A new empty frame after this one, in every view', onclick: () => frameStructure(app, 'New frame', (s) => addFrame(s.project, currentAnimation(s), index)) }, icon('plus'), 'New frame'),
    h('button.btn.quiet', { title: 'A copy of this frame after it, in every view', onclick: () => frameStructure(app, 'Duplicate frame', (s) => addFrame(s.project, currentAnimation(s), index, true)) }, 'Duplicate'),
    h('button.btn.quiet', { title: 'Move this frame earlier (or drag it)', 'aria-label': 'Move frame earlier', disabled: index === 0, onclick: () => move(-1) }, '←'),
    h('button.btn.quiet', { title: 'Move this frame later (or drag it)', 'aria-label': 'Move frame later', disabled: index >= count - 1, onclick: () => move(1) }, '→'),
    deleteButton(app, index, count),
    h('span.sep'),
    h('button.btn.quiet', { title: `Clean a ChatGPT image into frame ${index + 1} of the ${directionLabel(direction).toLowerCase()} view`, 'aria-label': 'Image into this frame', onclick: () => chooseFile((file) => openImport(app, direction, file, index)) }, icon('upload'), 'Image into frame…'),
    views > 1 ? h('button.btn.quiet', { title: `Copy the ${directionLabel(direction).toLowerCase()} view's frame ${index + 1} into frame ${index + 1} of every other view, as a start for them`, 'aria-label': 'Copy to other views', onclick: () => frameStructure(app, 'Copy frame to every view', (s) => { copyFrameToViews(s.project, currentAnimation(s), direction, index); return index; }) }, 'Copy to views') : null,
  ];
}

// the Move frame tool, and its four arrows while it is on
function moveFrameButtons(app) {
  const on = app.store.state.tool === 'moveframe';
  const arrow = (label, text, dx, dy) => h('button.btn.quiet', { title: `Move this frame 1 px ${label}`, 'aria-label': `Move this frame ${label}`, onclick: () => shiftCurrentFrame(app, dx, dy) }, text);

  return [
    h(`button.btn.quiet${on ? '.on' : ''}`, { 'aria-pressed': String(on), title: 'Drag the frame on the canvas, or use the arrow keys (V). The faded frames are your guide.', onclick: () => app.store.set({ tool: on ? 'pencil' : 'moveframe', mode: 'edit' }) }, 'Move frame'),
    ...(on ? [arrow('left', '◀', -1, 0), arrow('up', '▲', 0, -1), arrow('down', '▼', 0, 1), arrow('right', '▶', 1, 0)] : []),
  ];
}

// how the frames are shown and played
export function playButtons(app, playing, onPlay) {
  const { state } = app.store;
  const animation = currentAnimation(state);

  return [
    ...moveFrameButtons(app),
    h(`button.btn.quiet${state.showPins ? '.on' : ''}`, { 'aria-pressed': String(state.showPins), title: 'Pins mark the head, hands, hips and feet in each frame (tool P)', onclick: () => app.store.set({ showPins: !state.showPins }) }, 'Pins'),
    state.tool === 'pin' ? h('select.input', { id: 'pin-name', 'aria-label': 'Pin to place', onchange: (event) => app.store.set({ pinName: event.target.value }) }, PIN_NAMES.map((name) => h('option', { value: name, selected: state.pinName === name }, name))) : null,
    h(`button.btn.quiet${state.onion ? '.on' : ''}`, { 'aria-pressed': String(state.onion), title: 'Show the frames before and after, faded', onclick: () => app.store.set({ onion: !state.onion }) }, 'Onion skin'),
    h('label.group', { for: 'fps', style: { gap: '4px' } }, h('input.input.mono', { id: 'fps', type: 'number', min: '1', max: '30', value: String(animation.fps), style: { width: '52px' }, onchange: (event) => restructure(app, 'Frame rate', (s) => { currentAnimation(s).fps = Math.max(1, Math.min(30, Number(event.target.value) || 8)); }) }), 'fps'),
    h('button.btn', { onclick: onPlay }, playing ? 'Pause' : 'Play'),
  ];
}
