import { node, toast } from '../dom.js';
import { drawChecker } from '../checker.js';
import { afterPress } from '../after-press.js';
import { saveFrames, saveGamePack, saveGifs, saveSheetsWithJson } from '../export-files.js';
import { actionRow, fieldRow, listGroup, switchRow } from '../list-group.js';

export function numberField(label, value, id, onChange) {
  return fieldRow(
    label,
    node('input.input.mono', {
      id,
      type: 'number',
      min: '1',
      value: String(value),
      onchange: (event) => afterPress(() => onChange(Number(event.target.value))),
    }),
  );
}

function nativeOf(sheet) {
  const native = document.createElement('canvas');

  native.width = sheet.width;
  native.height = sheet.height;
  const pixels = new ImageData(new Uint8ClampedArray(sheet.pixels), sheet.width, sheet.height);
  native.getContext('2d').putImageData(pixels, 0, 0);

  return native;
}

// the sheet as it will be saved, scaled up on the checkerboard to fit the dialog
export function sheetPreview(result) {
  const { sheet } = result;
  const scale = Math.max(
    1,
    Math.min(4, Math.floor(860 / sheet.width), Math.floor(320 / sheet.height)),
  );
  const canvas = node('canvas', {
    role: 'img',
    'aria-label': 'The sprite sheet as it will be saved',
    style: { maxWidth: '100%', imageRendering: 'pixelated' },
  });

  canvas.width = sheet.width * scale;
  canvas.height = sheet.height * scale;
  const context = canvas.getContext('2d');
  drawChecker(context, canvas, scale * 4);
  context.imageSmoothingEnabled = false;
  context.drawImage(nativeOf(sheet), 0, 0, canvas.width, canvas.height);

  return canvas;
}

function manifestText(result, settings) {
  const frame = `frame: { width: ${settings.frameWidth}, height: ${settings.frameHeight} },\nanchor: { x: ${settings.anchorX}, y: ${settings.anchorY} },`;
  const rows = JSON.stringify(result.manifest, null, 2).replace(/"([A-Za-z]+)":/g, '$1:');

  return `// src/data/sprites.js, SPRITES\n${frame}\n// in animations:\n${result.name}: ${rows},`;
}

// the lines Naga Eleven's SPRITES manifest needs for this sheet, to copy into the game
export function manifestBlock(result, settings) {
  const text = manifestText(result, settings);
  const copy = () =>
    navigator.clipboard.writeText(text).then(
      () => toast('Copied'),
      () => toast('Select the text and copy it'),
    );

  return node(
    'div.field',
    {},
    node('span', {}, "For the game's manifest"),
    node('pre.report', {}, text),
    node('div.group', {}, node('button.btn', { onclick: copy }, 'Copy')),
  );
}

const FORMATS = [
  [
    saveSheetsWithJson,
    'Sheets + JSON',
    'Each animation as a sheet with Aseprite-style JSON: Phaser, Godot and Unity importers read it',
  ],
  [saveFrames, 'Separate frames', 'Every frame as its own PNG, in folders by animation and view'],
  [saveGifs, 'Animated GIFs', 'A looping GIF per animation and view, to share or check the motion'],
];

// every animation in a format any engine reads, and the game pack when the game has one
export function formatButtons(run, gamePack) {
  const buttons = FORMATS.map(([save, label, title]) =>
    actionRow(label, () => run(save), { title }),
  );
  const pack = gamePack
    ? actionRow('Naga Eleven game pack', () => run(saveGamePack), {
        title: "Every animation at the repo's paths, with the SPRITES manifest",
      })
    : null;

  return listGroup({ title: 'Every animation, for any engine' }, buttons, pack);
}

export function mirroredToggle(on, { gamePack, onChange }) {
  const hint = gamePack
    ? 'Off: the game mirrors them itself (mirrorOf), like run and kick'
    : 'Off: flip them in your game. On: drawn into the sheet';

  return switchRow('Add the mirrored rows', { id: 'mirrored', checked: on, hint }, onChange);
}
