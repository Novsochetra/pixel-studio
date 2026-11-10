import { node, replace, toast } from '../dom.js';
import { openSheet } from '../sheet.js';
import { saveFile } from '../save-file.js';
import { dataUrlSprite, spriteCanvas, spritePng } from '../../io/images.js';
import { lineUp, lineUpScale } from '../../model/cast.js';

const DOWNLOAD_GAP_PIXELS = 8;
const TALLEST_ON_SCREEN_PX = 240;

const HINT =
  'Every project at the same pixel size, standing on one line, so heights and widths can be ' +
  'checked against each other. Each shows the first frame of its reference view. Pick one to open it.';

async function readCast(cast) {
  const urls = await Promise.all(cast.map((member) => member.url));
  const sprites = await Promise.all(
    urls.map((url) => (url ? dataUrlSprite(url).catch(() => null) : null)),
  );
  const drawn = cast.map((member, i) => ({ ...member, sprite: sprites[i] }));

  return {
    drawn: drawn.filter((member) => member.sprite),
    empty: drawn.filter((member) => !member.sprite).map((member) => member.name),
  };
}

function memberButton({ name, sprite, open }, { scale, close }) {
  const choose = () => {
    close();
    open?.();
  };

  return node(
    'button.line-up-member',
    { title: open ? `Open ${name}` : `${name} is open now`, onclick: choose },
    node('span.line-up-art', {}, spriteCanvas(sprite, scale)),
    node('span.line-up-name', {}, name),
    node('span.view-meta', {}, `${sprite.width}×${sprite.height}`),
  );
}

async function download(drawn, scale) {
  const picture = lineUp(
    drawn.map((each) => each.sprite),
    DOWNLOAD_GAP_PIXELS,
  );

  await saveFile(`line-up-${scale}x.png`, await spritePng(picture, scale));
}

function lineUpBody({ drawn, empty }, close) {
  const scale = lineUpScale(
    drawn.map((each) => each.sprite),
    TALLEST_ON_SCREEN_PX,
  );
  const save = () =>
    download(drawn, scale).catch(() => toast('The line-up could not be saved as a picture.'));

  return [
    node('p.hint', {}, HINT),
    node(
      'div.line-up',
      { 'data-scale': scale },
      drawn.map((each) => memberButton(each, { scale, close })),
    ),
    empty.length ? node('p.hint', {}, `Nothing drawn yet: ${empty.join(', ')}.`) : null,
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: close }, 'Close'),
      node(
        'button.btn.primary',
        { disabled: !drawn.length, onclick: save },
        `Download the line-up (PNG, ${scale}×)`,
      ),
    ),
  ];
}

export async function openLineUp(cast) {
  const sheet = openSheet('Line-up', null, { wide: true });
  const body = node('div', {}, node('p.hint', {}, 'Lining up…'));

  sheet.body.append(body);
  replace(body, lineUpBody(await readCast(cast), sheet.close));
}
