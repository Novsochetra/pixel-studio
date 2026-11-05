import { h, icon, replace, toast } from './dom.js';
import { commit, currentAnimation, currentLayer, restructure } from './actions.js';
import { addLayer, layerStack, moveLayer, removeLayer, updateLayer } from '../model/structure.js';
import { frameAt } from '../model/project.js';
import { decodeImage } from '../io/images.js';
import { createSprite } from '../model/sprite.js';
import { chooseFile } from './views-panel.js';

// a picture fitted inside the canvas, smoothly scaled, to trace over
async function fitPicture(file, width, height) {
  const image = await decodeImage(file);
  const scale = Math.min(width / image.width, height / image.height);
  const source = document.createElement('canvas');
  source.width = image.width;
  source.height = image.height;
  source.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  const target = document.createElement('canvas');
  target.width = width;
  target.height = height;
  const context = target.getContext('2d', { willReadFrequently: true });
  const w = Math.round(image.width * scale);
  const hgt = Math.round(image.height * scale);
  context.drawImage(source, Math.round((width - w) / 2), height - hgt, w, hgt);
  const sprite = createSprite(width, height);
  sprite.pixels.set(context.getImageData(0, 0, width, height).data);

  return sprite;
}

function addReference(app) {
  chooseFile(async (file) => {
    const { state } = app.store;
    const picture = await fitPicture(file, state.project.canvas.width, state.project.canvas.height).catch(() => null);

    if (!picture) {
      toast('That file is not a picture the browser can open.');

      return;
    }

    restructure(app, 'Add picture to trace', (s) => {
      const animation = currentAnimation(s);
      const key = addLayer(s.project, animation, `Trace: ${file.name}`, 'reference', layerStack(animation)[0]?.key ?? null);
      moveLayer(animation, key, -1);
      frameAt(s.project, s.at).layers.find((l) => l.key === key).sprite = picture;

      return { layer: key };
    });
    toast('Picture added under your art, faded. Move it with the select tool; it never goes into downloads.');
  });
}

function layerRow(app, entry, active) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const update = (label, patch) => restructure(app, label, (s) => { updateLayer(currentAnimation(s), entry.key, patch); });
  const move = (event, step) => {
    event.stopPropagation();
    restructure(app, 'Move layer', (s) => { moveLayer(currentAnimation(s), entry.key, step); });
  };

  return h(
    'div.layer-row',
    { 'aria-current': String(active), 'data-hidden': String(!entry.visible), onclick: () => app.store.set({ at: { ...state.at, layer: entry.key }, selection: null }) },
    h(`button.btn.quiet.eye${entry.visible ? '' : '.off'}`, {
      'aria-pressed': String(entry.visible),
      'aria-label': `${entry.visible ? 'Hide' : 'Show'} ${entry.name}`,
      title: entry.visible ? 'Shown. Click to hide (hidden layers stay out of downloads)' : 'Hidden. Click to show',
      onclick: (event) => { event.stopPropagation(); update(entry.visible ? 'Hide layer' : 'Show layer', { visible: !entry.visible }); },
    }, icon(entry.visible ? 'eye' : 'eye-off')),
    h('input.input', { value: entry.name, 'aria-label': 'Layer name', onclick: (event) => event.stopPropagation(), onchange: (event) => update('Rename layer', { name: event.target.value.trim() || entry.name }) }),
    entry.kind === 'reference' ? h('span.badge', {}, 'Trace') : null,
    entry.visible ? null : h('span.badge', {}, 'Hidden'),
    h('button.btn.quiet', { title: 'Move up', 'aria-label': `Move ${entry.name} up`, onclick: (event) => move(event, 1) }, '↑'),
    h('button.btn.quiet', { title: 'Move down', 'aria-label': `Move ${entry.name} down`, onclick: (event) => move(event, -1) }, '↓'),
    h('button.btn.quiet', {
      title: 'Delete layer',
      'aria-label': `Delete ${entry.name}`,
      onclick: (event) => {
        event.stopPropagation();

        const arts = layerStack(animation).filter((l) => l.kind !== 'reference');

        if (entry.kind !== 'reference' && arts.length <= 1) {
          toast('Keep at least one art layer.');

          return;
        }

        restructure(app, `Delete ${entry.name}`, (s) => { removeLayer(currentAnimation(s), entry.key); });
      },
    }, '×'),
  );
}

function referenceStrength(app, layer) {
  return h('label.field', { for: 'trace-opacity' }, h('span', {}, 'How strong the picture shows'), h('input', {
    type: 'range',
    id: 'trace-opacity',
    min: '0.1',
    max: '1',
    step: '0.05',
    value: String(layer.opacity),
    onchange: (event) => restructure(app, 'Picture strength', (s) => { updateLayer(currentAnimation(s), layer.key, { opacity: Number(event.target.value) }); }),
  }));
}

export function renderLayersPanel(el, app) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const active = currentLayer(state);
  const clearLayer = () => commit(app, 'Clear layer', [active], () => active.sprite.pixels.fill(0));

  replace(
    el,
    h('h2', {}, 'Layers', h('span.hint', {}, 'top first')),
    h('div.view-list', {}, [...layerStack(animation)].reverse().map((entry) => layerRow(app, entry, entry.key === active.key))),
    active.kind === 'reference' ? referenceStrength(app, active) : null,
    h('p.hint', {}, 'Layers are see-through sheets stacked inside every frame: your art, and pictures to trace. The frames below the canvas are the steps of the animation.'),
    h(
      'div.group',
      { style: { gap: '6px', flexWrap: 'wrap' } },
      h('button.btn', { onclick: () => restructure(app, 'Add layer', (s) => ({ layer: addLayer(s.project, currentAnimation(s), `Layer ${layerStack(animation).length + 1}`, 'art', active.key) })) }, 'Add layer'),
      h('button.btn', { onclick: () => addReference(app) }, 'Add picture to trace…'),
      h('button.btn.quiet', { onclick: clearLayer, title: 'Erase everything on this layer in this frame' }, 'Clear'),
    ),
  );
}
