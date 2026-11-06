import { node } from '../dom.js';
import { openSheet } from '../sheet.js';
import { currentAnimation, restructure } from '../actions.js';
import { nameSuggestions, posesToStartFrom, startAnimation } from '../../model/animations.js';
import { kindOf } from '../../model/kinds.js';
import { wholeNumber } from '../../model/numbers.js';
import { numberInput } from '../number-input.js';

function numberField(options) {
  const input = numberInput(options);

  return { input, el: node('label.field', {}, node('span', {}, options.label), input) };
}

function startChoice(project, open) {
  const select = node(
    'select.input',
    { id: 'new-animation-start' },
    node('option', { value: '' }, 'Empty frames'),
    posesToStartFrom(project, open).map((animation) =>
      node('option', { value: animation.id }, `Every frame as ${animation.name}'s first frame`),
    ),
  );

  return {
    select,
    el: node('label.field', { for: 'new-animation-start' }, node('span', {}, 'Start from'), select),
  };
}

function nameField(project, item) {
  const names = nameSuggestions(project);
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

// the animation the sheet's fields describe, made and opened
function createAnimation(app, { name, frames, fps, start, item }, close) {
  const pose = start.select.value;
  const options = {
    name: name.input.value.trim() || name.input.placeholder,
    frames: wholeNumber(frames.input.value, { min: 1, max: 48 }),
    fps: wholeNumber(fps.input.value, { min: 1, max: 30, fallback: 8 }),
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
  const frames = numberField({
    id: 'new-animation-frames',
    label: 'Frames',
    max: 48,
    value: item === 'animation' ? 4 : 1,
  });
  const fps = numberField({
    id: 'new-animation-fps',
    label: 'Frames per second',
    max: 30,
    value: like.fps,
  });
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
