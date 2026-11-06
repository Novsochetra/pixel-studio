import { node, toast } from './dom.js';
import { currentAnimation, restructure } from './actions.js';
import { addLayer, layerStack, moveLayer, updateLayer } from '../model/structure.js';
import { frameAt } from '../model/project.js';
import { decodeImage } from '../io/images.js';
import { createSprite } from '../model/sprite.js';
import { chooseFile } from './choose-file.js';

// a picture fitted inside the canvas, smoothly scaled, standing on its bottom edge
async function fitPicture(file, { width, height }) {
  const image = await decodeImage(file);
  const scale = Math.min(width / image.width, height / image.height);
  const source = document.createElement('canvas');
  const target = document.createElement('canvas');
  const fitted = {
    width: Math.round(image.width * scale),
    height: Math.round(image.height * scale),
  };

  source.width = image.width;
  source.height = image.height;
  source.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  target.width = width;
  target.height = height;
  const context = target.getContext('2d', { willReadFrequently: true });
  const left = Math.round((width - fitted.width) / 2);
  context.drawImage(source, left, height - fitted.height, fitted.width, fitted.height);
  const sprite = createSprite(width, height);
  sprite.pixels.set(context.getImageData(0, 0, width, height).data);

  return sprite;
}

export function addPicture(app) {
  chooseFile(async (file) => {
    const picture = await fitPicture(file, app.store.state.project.canvas).catch(() => null);

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
    });
    toast(
      'Picture added under your art, faded; never downloaded. Click it to change how strongly it shows.',
    );
  });
}

export function pictureStrength(app, picture) {
  const change = (event) =>
    restructure(app, 'Picture strength', (draft) => {
      updateLayer(currentAnimation(draft), picture.key, { opacity: Number(event.target.value) });
    });

  return node(
    'label.field',
    { for: 'trace-opacity' },
    node('span', {}, 'How strongly the picture shows'),
    node('input', {
      type: 'range',
      id: 'trace-opacity',
      min: '0.1',
      max: '1',
      step: '0.05',
      value: String(picture.opacity),
      onchange: change,
    }),
  );
}
