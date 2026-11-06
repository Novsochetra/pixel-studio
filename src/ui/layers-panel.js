import { node, replace, toast } from './dom.js';
import { commit, currentAnimation, currentLayer, restructure } from './actions.js';
import { addLayer, layerStack, moveLayer, updateLayer } from '../model/structure.js';
import { layerRow } from './layer-row.js';
import { frameAt } from '../model/project.js';
import { decodeImage } from '../io/images.js';
import { createSprite } from '../model/sprite.js';
import { chooseFile } from './choose-file.js';

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
  const fittedWidth = Math.round(image.width * scale);
  const hgt = Math.round(image.height * scale);
  context.drawImage(source, Math.round((width - fittedWidth) / 2), height - hgt, fittedWidth, hgt);
  const sprite = createSprite(width, height);
  sprite.pixels.set(context.getImageData(0, 0, width, height).data);

  return sprite;
}

function addReference(app) {
  chooseFile(async (file) => {
    const { state } = app.store;
    const picture = await fitPicture(
      file,
      state.project.canvas.width,
      state.project.canvas.height,
    ).catch(() => null);

    if (!picture) {
      toast('That file is not a picture the browser can open.');

      return;
    }

    restructure(app, 'Add picture to trace', (draft) => {
      const animation = currentAnimation(draft);
      const key = addLayer(draft.project, animation, {
        name: `Trace: ${file.name}`,
        kind: 'reference',
        above: layerStack(animation)[0]?.key ?? null,
      });
      moveLayer(animation, key, -1);
      frameAt(draft.project, draft.at).layers.find((layer) => layer.key === key).sprite = picture;

      return { layer: key };
    });
    toast(
      'Picture added under your art, faded. Move it with the select tool; it never goes into downloads.',
    );
  });
}

function referenceStrength(app, layer) {
  return node(
    'label.field',
    { for: 'trace-opacity' },
    node('span', {}, 'How strong the picture shows'),
    node('input', {
      type: 'range',
      id: 'trace-opacity',
      min: '0.1',
      max: '1',
      step: '0.05',
      value: String(layer.opacity),
      onchange: (event) =>
        restructure(app, 'Picture strength', (draft) => {
          updateLayer(currentAnimation(draft), layer.key, { opacity: Number(event.target.value) });
        }),
    }),
  );
}

function layerButtons(app, active) {
  const animation = currentAnimation(app.store.state);
  const add = () =>
    restructure(app, 'Add layer', (draft) => ({
      layer: addLayer(draft.project, currentAnimation(draft), {
        name: `Layer ${layerStack(animation).length + 1}`,
        above: active.key,
      }),
    }));
  const clear = () => commit(app, 'Clear layer', [active], () => active.sprite.pixels.fill(0));

  return node(
    'div.group',
    { style: { gap: '6px', flexWrap: 'wrap' } },
    node('button.btn', { onclick: add }, 'Add layer'),
    node('button.btn', { onclick: () => addReference(app) }, 'Add picture to trace…'),
    node(
      'button.btn.quiet',
      { onclick: clear, title: 'Erase everything on this layer in this frame' },
      'Clear',
    ),
  );
}

export function renderLayersPanel(el, app) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const active = currentLayer(state);
  const rows = [...layerStack(animation)]
    .reverse()
    .map((entry) => layerRow(app, entry, entry.key === active.key));

  replace(
    el,
    node('h2', { tabindex: '0' }, 'Layers', node('span.hint', {}, 'top first')),
    node('div.view-list', {}, rows),
    active.kind === 'reference' ? referenceStrength(app, active) : null,
    layerButtons(app, active),
  );
}
