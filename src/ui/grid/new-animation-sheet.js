import { node } from '../dom.js';
import { openSheet } from '../sheet.js';
import { currentAnimation, restructure } from '../actions.js';
import { startAnimation } from '../../model/animations.js';
import { kindOf } from '../../model/kinds.js';
import { gameOf } from '../../model/presets.js';
import { compositeFrame } from '../../model/composite.js';
import { bounds } from '../../model/sprite.js';

function suggestions(project) {
  const used = new Set(project.animations.map((animation) => animation.name));
  const names = [...(gameOf(project).names ?? []), ...kindOf(project).names];

  return [...new Set(names)].filter((name) => !used.has(name));
}

function numberField(id, label, value, max) {
  const input = node('input.input.mono', {
    id,
    type: 'number',
    min: '1',
    max: String(max),
    value: String(value),
  });

  return { input, el: node('label.field', {}, node('span', {}, label), input) };
}

const drawn = (project, animation) =>
  Object.values(animation.directions).some(({ frames }) =>
    bounds(compositeFrame(frames[0], project.canvas.width, project.canvas.height)),
  );

// empty frames, or every frame starting as the first frame of an animation that has one drawn:
// the standing pose, or the one open
function startChoice(project, open) {
  const poses = [open, ...project.animations.filter((animation) => animation !== open)].filter(
    (animation) => drawn(project, animation),
  );
  const select = node(
    'select.input',
    { id: 'new-animation-start' },
    node('option', { value: '' }, 'Empty frames'),
    poses.map((animation) =>
      node('option', { value: animation.id }, `Every frame as ${animation.name}'s first frame`),
    ),
  );

  return {
    select,
    el: node('label.field', { for: 'new-animation-start' }, node('span', {}, 'Start from'), select),
  };
}

function nameField(project, item) {
  const names = suggestions(project);
  const input = node('input.input', {
    id: 'new-animation-name',
    'aria-label': 'Name',
    placeholder: names[0] ?? `${item} ${project.animations.length + 1}`,
  });
  const pick = (name) => {
    input.value = name;
  };
  const chips = node(
    'div.start-sizes',
    { role: 'group', 'aria-label': 'Names' },
    names.map((name) =>
      node('button.btn.quiet', { type: 'button', onclick: () => pick(name) }, name),
    ),
  );

  return {
    input,
    el: node('div', {}, node('label.field', {}, node('span', {}, 'Name'), input), chips),
  };
}

const within = (input, max, fallback) =>
  Math.max(1, Math.min(max, Math.round(Number(input.value)) || fallback));

// the animation the sheet's fields describe, made and opened
function createAnimation(app, { name, frames, fps, start, item }, close) {
  const pose = start.select.value;
  const options = {
    name: name.input.value.trim() || name.input.placeholder,
    frames: within(frames.input, 48, 1),
    fps: within(fps.input, 30, 8),
    start: pose ? 'pose' : 'empty',
  };
  restructure(app, `New ${item}: ${options.name}`, (draft) => {
    const from =
      draft.project.animations.find((animation) => animation.id === pose) ??
      currentAnimation(draft);

    return { animation: startAnimation(draft.project, from, options).id, frame: 0, layer: null };
  });
  close();
}

// A new animation (or tile, or icon) with the views of the one open: its name, how many frames,
// how fast, and whether its frames start empty or from the open one's first frame.
export function openNewAnimationSheet(app) {
  const { state } = app.store;
  const like = currentAnimation(state);
  const item = kindOf(state.project).itemName;
  const sheet = openSheet(`New ${item}`);
  const name = nameField(state.project, item);
  const frames = numberField('new-animation-frames', 'Frames', item === 'animation' ? 4 : 1, 48);
  const fps = numberField('new-animation-fps', 'Frames per second', like.fps, 30);
  const start = startChoice(state.project, like);
  const create = () => createAnimation(app, { name, frames, fps, start, item }, sheet.close);

  sheet.body.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input')) {
      event.preventDefault();
      create();
    }
  });

  sheet.body.append(
    name.el,
    node('div.start-row', {}, frames.el, fps.el),
    start.el,
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: sheet.close }, 'Cancel'),
      node('button.btn.primary', { onclick: create }, `Create ${item}`),
    ),
  );
}
