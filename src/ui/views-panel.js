import { h, icon, replace } from './dom.js';
import { directionSprite, directionsInUse, hiddenArt, selectDirection } from './actions.js';
import { directionLabel } from '../model/project.js';
import { bounds, colorCounts } from '../model/sprite.js';
import { openImport } from './import-sheet.js';
import { openBatchSheet } from './batch-sheet.js';
import { openChatgptSheet } from './chatgpt-sheet.js';
import { referenceOf } from '../model/reference.js';

export function drawThumbnail(canvas, sprite, size = 104, frameBox = null) {
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const box = sprite && (frameBox ?? bounds(sprite));

  if (!box) {
    return;
  }

  const side = Math.max(box.right - box.left, box.bottom - box.top);
  const scale = size / side;
  const native = document.createElement('canvas');
  native.width = sprite.width;
  native.height = sprite.height;
  native.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height), 0, 0);
  context.imageSmoothingEnabled = false;
  const w = (box.right - box.left) * scale;
  const hgt = (box.bottom - box.top) * scale;
  context.drawImage(native, box.left, box.top, box.right - box.left, box.bottom - box.top, (size - w) / 2, (size - hgt) / 2, w, hgt);
}

function chooseFiles(onFiles) {
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  input.addEventListener('change', () => {
    if (input.files.length) {
      onFiles([...input.files]);
    }

    input.remove();
  });
  document.body.append(input);
  input.click();
}

function chooseFile(onFile, accept = 'image/*') {
  const input = h('input', { type: 'file', accept, hidden: true });
  input.addEventListener('change', () => {
    if (input.files[0]) {
      onFile(input.files[0]);
    }

    input.remove();
  });
  document.body.append(input);
  input.click();
}

function viewRow(app, direction) {
  const { state } = app.store;
  const sprite = directionSprite(state, direction);
  const thumb = h('canvas', { 'aria-hidden': 'true' });
  drawThumbnail(thumb, sprite);
  const box = sprite && bounds(sprite);
  const hidden = hiddenArt(state, direction);
  const meta = box
    ? `${box.right - box.left}×${box.bottom - box.top} px · ${colorCounts(sprite).length} colours${hidden.length ? ' · some art hidden' : ''}`
    : hidden.length ? `Art on hidden layer${hidden.length > 1 ? 's' : ''}: ${hidden.map((l) => l.name).join(', ')}` : 'Empty: drop or upload an image';
  const isReference = direction === referenceOf(state.project);

  return h(
    'div.view-row',
    {
      role: 'button',
      tabindex: '0',
      'aria-current': String(state.at.direction === direction && state.mode === 'edit'),
      onclick: () => {
        selectDirection(app, direction);
        app.store.set({ mode: 'edit' });
      },
      onkeydown: (event) => event.key === 'Enter' && event.currentTarget.click(),
    },
    thumb,
    h('div', {}, h('div.view-name', {}, directionLabel(direction), ' ', isReference ? h('span.badge', {}, 'Reference') : null), h('div.view-meta', {}, meta)),
    h(
      'button.btn.quiet',
      {
        title: `Clean a ChatGPT image into frame ${state.at.frame + 1} of the ${directionLabel(direction).toLowerCase()} view`,
        'aria-label': `Clean an image into ${directionLabel(direction)}`,
        onclick: (event) => {
          event.stopPropagation();
          chooseFile((file) => openImport(app, direction, file));
        },
      },
      icon('upload'),
    ),
  );
}

export function renderViewsPanel(el, app) {
  replace(
    el,
    h('h2', { tabindex: '0' }, 'Views'),
    h('div.view-list', {}, directionsInUse(app.store.state).map((direction) => viewRow(app, direction))),
    h('div.group', { style: { gap: '6px' } },
      h('button.btn', { style: { flex: '1' }, onclick: () => openChatgptSheet(app) }, 'Ask ChatGPT…'),
      h('button.btn', { style: { flex: '1' }, onclick: () => chooseFiles((files) => openBatchSheet(app, files)) }, icon('upload'), 'Clean several…')),
    h('p.hint', {}, 'Drop a ChatGPT image on the canvas to clean it into the view you are editing.'),
  );
}

export { chooseFile };
