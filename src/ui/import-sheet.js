import { node, replace, toast } from './dom.js';
import { openSheet, previewCanvas } from './sheet.js';
import { currentAnimation, referenceSprite, replaceDirectionArt } from './actions.js';
import { cleanImage } from '../io/cleaner.js';
import { decodeImage } from '../io/images.js';
import { directionLabel } from '../model/project.js';
import { keepVersion } from './versions-sheet.js';
import { referenceOf } from '../model/reference.js';

function cellText([sx, sy]) {
  return Math.abs(sx - sy) < 1e-6
    ? `${sx.toFixed(2)} px`
    : `${sx.toFixed(2)} × ${sy.toFixed(2)} px (not square)`;
}

function reportText(report, refHeight, refName) {
  const lines = [`Grid: one art pixel = ${cellText(report.cell)} of the image`];

  if (report.alone) {
    lines.push(
      report.scaled
        ? `Nothing to match yet: kept its own colours, scaled ${report.scaled.fy.toFixed(3)}× to fit the canvas`
        : 'Nothing to match yet: kept its own colours and size',
    );
  } else if (report.scaled) {
    lines.push(
      `Drawn ${report.scaled.drawnHeight} px tall; scaled ${report.scaled.fx.toFixed(3)}× wide, ${report.scaled.fy.toFixed(3)}× tall to match the ${refName}'s ${refHeight}`,
    );
  } else {
    lines.push(`Drawn at the ${refName}'s scale: not resized`);
  }

  lines.push(`Result: ${report.size[0]} × ${report.size[1]} px, feet on row ${report.feetRow}`);

  return lines.join('\n');
}

function optionFields(options) {
  const height = node('input.input.mono', {
    type: 'number',
    min: '8',
    placeholder: 'Auto',
    value: options.height ?? '',
    id: 'import-height',
    'aria-label': 'Height in art pixels',
  });
  const cell = node('input.input.mono', {
    placeholder: 'Auto, or 7.18x9.19',
    value: options.cell ?? '',
    id: 'import-cell',
    'aria-label': 'Grid size',
  });
  const read = () => ({ height: Number(height.value) || null, cell: cell.value.trim() || null });

  return {
    read,
    el: node(
      'div.compare',
      {},
      node('label.field', {}, node('span', {}, 'Height (art pixels)'), height),
      node('label.field', {}, node('span', {}, 'Grid size, if the guess looks wrong'), cell),
    ),
  };
}

async function run(app, sheet, direction, image, options) {
  const { state } = app.store;
  const ref = referenceSprite(state);
  const status = node('p.report', {}, 'Cleaning… this takes a second or two.');
  replace(sheet.slot, status);

  // the reference pose itself, or an empty reference, is cleaned on its own; the reference view's
  // later frames are matched to its first, like every other view
  const alone = sheet.isReference || !refHeight(ref);

  try {
    const result = await cleanImage(
      image,
      { width: ref.width, height: ref.height, data: ref.pixels },
      { ...options, alone },
    );
    const sprite = {
      width: result.width,
      height: result.height,
      pixels: new Uint8ClampedArray(result.pixels),
    };
    const refBox = refHeight(ref);
    replace(
      sheet.slot,
      node(
        'div.compare',
        {},
        alone
          ? null
          : node(
              'figure',
              {},
              previewCanvas(ref, state.project.guides),
              node('figcaption', {}, `${directionLabel(referenceOf(state.project))} (reference)`),
            ),
        node(
          'figure',
          {},
          previewCanvas(sprite, state.project.guides),
          node('figcaption', {}, `${directionLabel(direction)}, cleaned`),
        ),
      ),
      node(
        'pre.report',
        {},
        reportText(result.report, refBox, directionLabel(referenceOf(state.project)).toLowerCase()),
      ),
    );
    sheet.result = sprite;
    sheet.accept.disabled = false;
  } catch (error) {
    replace(
      sheet.slot,
      node(
        'p.report',
        {},
        `This image could not be cleaned (${error.message}). Use a PNG or WebP of one character on a flat background, like ChatGPT's magenta.`,
      ),
    );
  }
}

function refHeight(sprite) {
  let top = null;
  let bottom = null;

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (sprite.pixels[(y * sprite.width + x) * 4 + 3]) {
        top ??= y;
        bottom = y;
      }
    }
  }

  return top === null ? 0 : bottom - top + 1;
}

// where a cleaned image goes: "Side" alone while there is one frame, "Side, frame 2" after
function placeName(app, direction, frame) {
  const frames = currentAnimation(app.store.state).directions[direction]?.frames.length ?? 1;

  return frames > 1
    ? `${directionLabel(direction)}, frame ${frame + 1}`
    : directionLabel(direction);
}

export async function openImport(app, direction, file, frame = app.store.state.at.frame) {
  const place = placeName(app, direction, frame);
  const sheet = openSheet(`Clean into ${place}`);
  const { project } = app.store.state;
  const firstWithIt = project.animations.find((animation) => animation.directions[direction]);
  sheet.isReference =
    direction === referenceOf(project) &&
    frame === 0 &&
    firstWithIt === currentAnimation(app.store.state);
  const source = node('img', {
    src: URL.createObjectURL(file),
    alt: `The image you chose: ${file.name}`,
  });
  sheet.slot = node('div', { style: { display: 'grid', gap: '12px' } });
  const fields = optionFields({});
  sheet.accept = node('button.btn.primary', { disabled: true }, `Use for ${place}`);
  sheet.accept.addEventListener('click', () => {
    keepVersion(app, `Before cleaning into ${place}`);
    replaceDirectionArt(app, direction, sheet.result, `Clean into ${place}`, frame);
    app.store.set({
      at: { ...app.store.state.at, direction, frame },
      mode: 'edit',
      selection: null,
    });
    sheet.close();
    toast(`${place} updated. Undo brings the old one back.`);
  });
  const image = await decodeImage(file).catch(() => null);
  const again = node(
    'button.btn',
    { onclick: () => image && run(app, sheet, direction, image, fields.read()) },
    'Clean again',
  );
  sheet.body.append(
    node(
      'div.compare',
      {},
      node('figure', {}, source, node('figcaption', {}, `Your image · ${file.name}`)),
      sheet.slot,
    ),
    fields.el,
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: sheet.close }, 'Cancel'),
      again,
      sheet.accept,
    ),
  );

  if (!image) {
    replace(
      sheet.slot,
      node(
        'p.report',
        {},
        'This file is not an image the browser can open. Try PNG, WebP or JPEG.',
      ),
    );

    return;
  }

  run(app, sheet, direction, image, {});
}
