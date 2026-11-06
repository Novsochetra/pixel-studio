// The brush: its size and shape in the Drawing panel and on [ and ], what the pencil and eraser
// paint with it, and its ring under the pointer.
import { openStudio } from './harness.mjs';
import { openExample, openPanel } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
await openPanel(page, 'Drawing');
const canvas = page.getByLabel('Pixel canvas');
const art = await canvas.boundingBox();
const [artWidth] = (await page.locator('#statusbar span').nth(1).textContent())
  .match(/\d+/g)
  .map(Number);
const zoom = art.width / artWidth;
const at = (x, y) => [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
const label = () => page.locator('.field', { has: page.locator('#brush-size') }).textContent();
const pressed = (name) =>
  page
    .getByRole('group', { name: 'Brush shape' })
    .getByRole('button', { name })
    .getAttribute('aria-pressed');
// which pixels of the art around [x, y] are pure green, read from the middle of each
const green = ([x, y], reach = 4) =>
  canvas.evaluate(
    (element, spot) => {
      const scale = element.width / spot.artWidth;
      const context = element.getContext('2d');
      let count = 0;

      for (let row = spot.y - spot.reach; row <= spot.y + spot.reach; row++) {
        for (let col = spot.x - spot.reach; col <= spot.x + spot.reach; col++) {
          const [red, grn, blue] = context.getImageData(
            Math.floor((col + 0.5) * scale),
            Math.floor((row + 0.5) * scale),
            1,
            1,
          ).data;
          count += red === 0 && grn === 255 && blue === 0 ? 1 : 0;
        }
      }

      return count;
    },
    { x, y, reach, artWidth },
  );
const sum = () =>
  canvas.evaluate((element) => {
    const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);

    return data.reduce((total, value) => (total * 31 + value) % 2147483647, 7);
  });
const away = () => page.mouse.move(2, 2);
const dot = async (x, y) => {
  await page.mouse.click(...at(x, y));
  await away();
};

check(
  (await label()).includes('Brush 1 px') && (await pressed('Round')) === 'true',
  'the brush starts at 1 px, round',
);
await page.fill('#colour-hex', '#00ff00');
await page.keyboard.press('Enter');
await page.evaluate(() => document.activeElement.blur());
await page.keyboard.press(']');
await page.keyboard.press(']');
check((await label()).includes('Brush 3 px'), '] twice makes it 3 px');

await dot(4, 4);
check((await green([4, 4])) === 5, 'a 3 px round brush paints a plus of five pixels');
await page
  .getByRole('group', { name: 'Brush shape' })
  .getByRole('button', { name: 'Square' })
  .click();
await dot(12, 4);
check((await green([12, 4])) === 9, 'a 3 px square brush paints nine');

const plain = await sum();
await page.mouse.move(...at(20, 20));
const ringed = await sum();
await away();
check(ringed !== plain, 'the brush shows as a ring under the pointer');
check((await sum()) === plain, 'and the ring goes when the pointer leaves the canvas');

await page.keyboard.press('e');
await dot(4, 4);
check((await green([4, 4])) === 0, 'the eraser takes the same brush: the plus is gone');
await page.keyboard.press('Meta+z');
check((await green([4, 4])) === 5, '⌘Z brings it back');

await page.keyboard.press('b');
await page.locator('#brush-size').evaluate((slider) => {
  slider.value = '5';
  slider.dispatchEvent(new window.Event('input', { bubbles: true }));
});
check((await label()).includes('Brush 5 px'), 'the slider sets the size');
await page.mouse.move(...at(30, 30));
await page.screenshot({ path: `${shots}/brush-ring.png` });
await page.keyboard.press('[');
check((await label()).includes('Brush 4 px'), '[ makes it smaller');

await finish();
