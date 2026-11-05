import { h, toast } from './dom.js';
import { DIRECTION_SETS, PROFILES } from '../model/profiles.js';
import { newProject } from '../model/project.js';
import { newGuide } from '../views/guides.js';

const SIZES = [32, 48, 64, 96, 128, 160, 192, 256];

function field(label, control) {
  return h('label.field', {}, h('span', {}, label), control);
}

function select(id, options, selected) {
  return h('select.input', { id }, options.map(([value, label]) => h('option', { value, selected: value === selected }, label)));
}

function numberInput(id, value, min, max) {
  return h('input.input.mono', { id, type: 'number', min: String(min), max: String(max), value: String(value) });
}

// One form for every kind of game: the profile sets sensible defaults, the rest can change.
export function newProjectForm(onCreate) {
  const name = h('input.input', { id: 'project-name', placeholder: 'Hero, Slime, Knight…', 'aria-label': 'Name' });
  const profile = select('project-profile', Object.entries(PROFILES).map(([id, p]) => [id, p.label]), 'generic');
  const directions = select('project-directions', Object.entries(DIRECTION_SETS).map(([id, set]) => [id, set.label]), 'four');
  const width = numberInput('project-width', 64, 8, 512);
  const height = numberInput('project-height', 64, 8, 512);
  const scale = numberInput('project-scale', 4, 1, 16);
  const sizes = h('div.group', { style: { gap: '4px', flexWrap: 'wrap' } }, SIZES.map((size) => h('button.btn', { type: 'button', onclick: () => { width.value = String(size); height.value = String(size); } }, `${size}`)));

  profile.addEventListener('change', () => {
    const naga = profile.value === 'naga-eleven';
    directions.value = PROFILES[profile.value].directionSet;
    width.value = height.value = naga ? '160' : '64';
    scale.value = naga ? '5' : '4';
  });

  const create = () => {
    const clamp = (input, min, max) => Math.max(min, Math.min(max, Math.round(Number(input.value)) || min));
    const tall = clamp(height, 8, 512);
    const project = newProject({
      name: name.value.trim() || 'New character',
      profile: profile.value,
      directionSet: directions.value,
      width: clamp(width, 8, 512),
      height: tall,
      scale: clamp(scale, 1, 16),
    });
    // cleaned art stands with its feet here, so the guide shows where every view should end
    project.guides = [newGuide('Feet', Math.round(tall * 0.8), 'bottom')];
    onCreate(project).then(() => toast(`${project.name} is ready. Drop a ChatGPT image on the canvas to start.`), (error) => toast(error.message));
  };

  return h(
    'div',
    { style: { display: 'grid', gap: '12px' } },
    h('div.compare', { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' } },
      field('Name', name),
      field('For', profile),
      field('Directions', directions)),
    h('div.compare', { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' } },
      field('Canvas width (art pixels)', width),
      field('Canvas height', height),
      field('Big copy: pixels per art pixel', scale)),
    h('div.field', {}, h('span', {}, 'Common sizes'), sizes),
    h('div.sheet-actions', {}, h('button.btn.primary', { onclick: create }, 'Create project')),
  );
}
