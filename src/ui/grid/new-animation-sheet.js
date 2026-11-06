import { node } from '../dom.js';
import { openSheet } from '../sheet.js';
import { currentAnimation, restructure } from '../actions.js';
import { startAnimation } from '../../model/animations.js';
import { kindOf } from '../../model/kinds.js';
import { gameOf } from '../../model/presets.js';

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

function startChoice(like) {
  const options = [
    ['empty', 'Empty frames'],
    ['pose', `Every frame starts as ${like.name}'s first frame`],
  ];

  return node(
    'div.field',
    { role: 'radiogroup', 'aria-label': 'Start from' },
    node('span', {}, 'Start from'),
    options.map(([value, label], i) =>
      node(
        'label.group',
        { style: { gap: '6px' } },
        node('input', { type: 'radio', name: 'start', value, checked: i === 0 }),
        label,
      ),
    ),
  );
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
  const start = startChoice(like);
  const create = () => {
    const options = {
      name: name.input.value.trim() || name.input.placeholder,
      frames: within(frames.input, 48, 1),
      fps: within(fps.input, 30, 8),
      start: start.querySelector('input:checked').value,
    };
    restructure(app, `New ${item}: ${options.name}`, (draft) => ({
      animation: startAnimation(draft.project, currentAnimation(draft), options).id,
      frame: 0,
      layer: null,
    }));
    sheet.close();
  };

  sheet.body.append(
    name.el,
    node('div.start-row', {}, frames.el, fps.el),
    start,
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: sheet.close }, 'Cancel'),
      node('button.btn.primary', { onclick: create }, `Create ${item}`),
    ),
  );
  name.input.focus();
}
