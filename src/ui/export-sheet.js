import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { currentAnimation } from './actions.js';
import { buildSheet } from '../export/sheet.js';
import { spritePng, checkerPainter } from '../io/images.js';
import { saveFile } from './save-file.js';
import { characterHeight, presetSettings, presetsFor, sane } from './export-settings.js';
import { saveFrames, saveGamePack, saveGifs, saveSheetsWithJson } from './export-files.js';
import { profileOf } from '../model/profiles.js';

function numberField(label, value, id, onChange) {
  return node(
    'label.field',
    { for: id },
    node('span', {}, label),
    node('input.input.mono', {
      id,
      type: 'number',
      min: '1',
      value: String(value),
      onchange: (event) => onChange(Number(event.target.value)),
    }),
  );
}

function manifestText(result, settings) {
  const frame = `frame: { width: ${settings.frameWidth}, height: ${settings.frameHeight} },\nanchor: { x: ${settings.anchorX}, y: ${settings.anchorY} },`;

  return `// src/data/sprites.js, SPRITES\n${frame}\n// in animations:\n${result.name}: ${JSON.stringify(result.manifest, null, 2).replace(/"([A-Za-z]+)":/g, '$1:')},`;
}

function preview(result) {
  const scale = Math.max(
    1,
    Math.min(4, Math.floor(860 / result.sheet.width), Math.floor(320 / result.sheet.height)),
  );
  const canvas = node('canvas');
  canvas.width = result.sheet.width * scale;
  canvas.height = result.sheet.height * scale;
  const context = canvas.getContext('2d');
  checkerPainter(scale * 2)(context, canvas.width, canvas.height);
  const native = document.createElement('canvas');
  native.width = result.sheet.width;
  native.height = result.sheet.height;
  native
    .getContext('2d')
    .putImageData(
      new ImageData(
        new Uint8ClampedArray(result.sheet.pixels),
        result.sheet.width,
        result.sheet.height,
      ),
      0,
      0,
    );
  context.imageSmoothingEnabled = false;
  context.drawImage(native, 0, 0, canvas.width, canvas.height);
  canvas.style.maxWidth = '100%';
  canvas.style.imageRendering = 'pixelated';

  return canvas;
}

export function openExportSheet(app) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const sheet = openSheet(`Sprite sheet: ${animation.name}`);
  const slot = node('div', { style: { display: 'grid', gap: '12px' } });
  let preset = presetsFor(state.project).some(([id]) => id === state.project.exportSettings?.preset)
    ? state.project.exportSettings.preset
    : 'fit';
  let settings = sane({
    ...presetSettings(state, preset),
    ...(state.project.exportSettings?.custom ?? {}),
  });
  let includeMirrored = state.project.exportSettings?.includeMirrored ?? false;

  const remember = () => {
    state.project.exportSettings = {
      preset,
      includeMirrored,
      custom: preset === 'custom' ? settings : null,
    };
    app.saver.markStructure();
  };

  const naga = profileOf(state.project).gamePack;
  const run = (save) =>
    save(state, { ...settings, includeMirrored }).then(
      (warnings) =>
        warnings.length &&
        toast(
          `Saved, but check: ${warnings.slice(0, 3).join(' ')}${warnings.length > 3 ? ` (and ${warnings.length - 3} more)` : ''}`,
        ),
      (error) => toast(`Could not make the files: ${error.message}`),
    );

  const draw = () => {
    const result = buildSheet(state.project, animation, { ...settings, includeMirrored });
    const set = (patch) => {
      settings = sane({ ...settings, ...patch });
      preset = 'custom';
      remember();
      draw();
    };
    const presets = node(
      'div.segmented',
      { role: 'group', 'aria-label': 'Frame size' },
      presetsFor(state.project).map(([id, label]) =>
        node(
          'button',
          {
            'aria-pressed': String(preset === id),
            onclick: () => {
              preset = id;
              settings = id === 'custom' ? settings : presetSettings(state, id);
              remember();
              draw();
            },
          },
          label,
        ),
      ),
    );
    const copy = node(
      'button.btn',
      {
        onclick: () =>
          navigator.clipboard.writeText(manifestText(result, settings)).then(
            () => toast('Copied'),
            () => toast('Select the text and copy it'),
          ),
      },
      'Copy',
    );

    replace(
      slot,
      presets,
      node(
        'div.compare',
        { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' } },
        numberField('Frame width', settings.frameWidth, 'frame-width', (value) =>
          set({ frameWidth: value }),
        ),
        numberField('Frame height', settings.frameHeight, 'frame-height', (value) =>
          set({ frameHeight: value }),
        ),
        numberField('Feet x in frame', settings.anchorX, 'anchor-x', (value) =>
          set({ anchorX: value }),
        ),
        numberField('Feet y in frame', settings.anchorY, 'anchor-y', (value) =>
          set({ anchorY: value }),
        ),
      ),
      node(
        'label.toggle-row',
        { for: 'mirrored' },
        node(
          'span',
          {},
          node('div', {}, 'Add the mirrored rows'),
          node(
            'div.hint',
            {},
            naga
              ? 'Off: the game mirrors them itself (mirrorOf), like run and kick'
              : 'Off: flip them in your game; on: drawn into the sheet',
          ),
        ),
        node('input.switch', {
          type: 'checkbox',
          role: 'switch',
          id: 'mirrored',
          checked: includeMirrored,
          onchange: (event) => {
            includeMirrored = event.target.checked;
            remember();
            draw();
          },
        }),
      ),
      node('div', { style: { overflowX: 'auto' } }, preview(result)),
      node(
        'p.hint',
        {},
        `${result.frames} frames × ${result.rows.length} rows (${result.rows.map((row) => row.direction).join(', ')}) · ${result.sheet.width}×${result.sheet.height} px · ${animation.fps} fps`,
      ),
      result.warnings.some((warning) => warning.includes('outside'))
        ? node(
            'p.hint',
            {},
            `Some art does not fit this frame; this character is ${characterHeight(state)} px tall. "Fit the art" makes a frame that holds it.`,
          )
        : null,
      result.warnings.length ? node('pre.report', {}, result.warnings.join('\n')) : null,
      naga
        ? node(
            'div.field',
            {},
            node('span', {}, "For the game's manifest"),
            node('pre.report', {}, manifestText(result, settings)),
            node('div.group', {}, copy),
          )
        : null,
      node(
        'div.field',
        {},
        node('span', {}, 'Every animation, for any engine'),
        node(
          'div.group',
          { style: { gap: '6px', flexWrap: 'wrap' } },
          node(
            'button.btn',
            {
              title:
                'Each animation as a sheet with Aseprite-style JSON: Phaser, Godot and Unity importers read it',
              onclick: () => run(saveSheetsWithJson),
            },
            'Sheets + JSON',
          ),
          node(
            'button.btn',
            {
              title: 'Every frame as its own PNG, in folders by animation and direction',
              onclick: () => run(saveFrames),
            },
            'Separate frames',
          ),
          node(
            'button.btn',
            {
              title: 'A looping GIF per animation and direction, to share or check the motion',
              onclick: () => run(saveGifs),
            },
            'Animated GIFs',
          ),
          naga
            ? node(
                'button.btn',
                {
                  title: "Every animation at the repo's paths, with the SPRITES manifest",
                  onclick: () => run(saveGamePack),
                },
                'Naga Eleven game pack',
              )
            : null,
        ),
      ),
      node(
        'div.sheet-actions',
        {},
        node('button.btn', { onclick: sheet.close }, 'Close'),
        node(
          'button.btn.primary',
          { onclick: async () => saveFile(`${result.name}.png`, await spritePng(result.sheet)) },
          `Download ${result.name}.png`,
        ),
      ),
    );
  };

  sheet.body.append(slot);
  draw();
}
