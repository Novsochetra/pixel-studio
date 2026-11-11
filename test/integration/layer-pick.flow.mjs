// Moving many layers at once: Shift-click or ⌘-click picks them, a drag or an arrow moves them all.
import { openStudio } from './harness.mjs';
import { frameAction, openExample, selectFrame } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
const canvas = page.getByLabel('Pixel canvas');
const art = await canvas.boundingBox();
const zoom = art.width / 160;
const at = (x, y) => [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
const pixels = () =>
  canvas.evaluate((element) => {
    const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
    let sum = element.width * 31 + element.height;

    for (let i = 0; i < data.length; i += 1) {
      sum = (sum * 33 + data[i]) % 2147483647;
    }

    return sum;
  });
const drag = async (from, to) => {
  await page.mouse.move(...at(...from));
  await page.mouse.down();
  await page.mouse.move(...at(...to), { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};
const row = (name) => page.locator('.layer-row', { hasText: name });
const eye = async (verb, name) => {
  await page.getByRole('button', { name: `${verb} ${name}`, exact: true }).click();
  await page.waitForTimeout(100);
};
const NAMES = ['Art', 'Hair', 'Hat'];
// what one layer looks like with the others hidden, with no tool drawing a handle over it
const alone = async (name) => {
  const others = NAMES.filter((other) => other !== name);

  await page.keyboard.press('b');

  for (const other of others) {
    await eye('Hide', other);
  }

  const sum = await pixels();

  for (const other of others) {
    await eye('Show', other);
  }

  await page.keyboard.press('t');

  return sum;
};
const allAlone = async () => ({
  art: await alone('Art'),
  hair: await alone('Hair'),
  hat: await alone('Hat'),
});
const colourAt = (x, y) =>
  canvas.evaluate(
    (element, [pixelX, pixelY]) => {
      const scale = element.width / 160;
      const place = [(pixelX + 0.5) * scale, (pixelY + 0.5) * scale];

      return element
        .getContext('2d')
        .getImageData(...place, 1, 1)
        .data.join();
    },
    [x, y],
  );
const picked = () =>
  page
    .locator('.layer-row[aria-selected="true"] .layer-name')
    .allTextContents()
    .then((names) => names.join());
const addLayer = async (name, from, to) => {
  await page.getByRole('button', { name: 'New layer', exact: true }).click();
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await drag(from, to);
};

await addLayer('Hair', [5, 5], [30, 15]);
await addLayer('Hat', [5, 30], [30, 40]);
const start = await allAlone();

await row('Hair').click();
await row('Hat').click({ modifiers: ['Meta'] });
check((await picked()) === 'Hat,Hair', '⌘-click picks a second layer');
check(
  (await page.getByRole('button', { name: /^Move:/ }).getAttribute('aria-pressed')) === 'true',
  'and the tool that moves layers is on',
);
check(await page.getByText('2 layers picked').isVisible(), 'the panel says how many are picked');
await page.screenshot({ path: `${shots}/layer-pick-two.png` });

const whole = await pixels();

await page.mouse.move(...at(5, 5));
await page.mouse.down();
await page.mouse.move(...at(35, 25), { steps: 8 });
check((await pixels()) !== whole, 'a drag shows the layers moving');
await page.screenshot({ path: `${shots}/layer-pick-drag.png` });
await page.mouse.up();
await page.waitForTimeout(150);
const wholeMoved = await pixels();

await page.keyboard.press('Meta+z');
await page.waitForTimeout(100);
check((await pixels()) === whole, 'one undo puts both back');
await page.keyboard.press('Meta+Shift+z');
await page.waitForTimeout(100);
check((await pixels()) === wholeMoved, 'one redo moves both again');

const moved = await allAlone();

check(moved.hair !== start.hair, 'letting go moves the first picked layer');
check(moved.hat !== start.hat, 'and the second');
check(moved.art === start.art, 'and not the layer left out');

await row('Hat').focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(100);
const nudged = await allAlone();

check(nudged.hair !== moved.hair && nudged.hat !== moved.hat, 'an arrow key moves both');
check(nudged.art === moved.art, 'and not the layer left out');

await row('Hair').click();
check((await picked()) === 'Hair', 'a plain click picks only that layer');

await row('Art').click();
await row('Hat').click({ modifiers: ['Shift'] });
check((await picked()) === 'Hat,Hair,Art', 'Shift-click picks all layers between');
check(
  (await page.evaluate(() => window.getSelection().toString())) === '',
  'and selects no words on the page',
);

await page.keyboard.press('p');
await page.mouse.click(...at(120, 20));
await page.waitForTimeout(100);
const pinColour = await colourAt(120, 20);

await page.keyboard.press('t');
await drag([80, 80], [85, 84]);
check((await colourAt(125, 24)) === pinColour, 'every layer picked moves the pin too');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(100);
check((await colourAt(120, 20)) === pinColour, 'one undo puts the whole frame back');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(100);
check((await picked()) === 'Hat,Hair,Art', 'and the layers stay picked');

await row('Art').click({ modifiers: ['Meta'] });
check((await picked()) === 'Hat,Hair', '⌘-click on a picked layer takes it away');

await drag([80, 80], [85, 85]);
const onOther = await allAlone();

check((await picked()) === 'Art', 'a drag on the art of another layer picks only that layer');
check(onOther.art !== nudged.art, 'and moves it');
check(onOther.hair === nudged.hair && onOther.hat === nudged.hat, 'and not the others');

await row('Hair').click();
await row('Hat').click({ modifiers: ['Meta'] });
await eye('Hide', 'Hat');
await drag([36, 25], [41, 30]);
check(
  (await page.locator('.toast').allTextContents()).join().includes('Hidden layers stay'),
  'a hidden layer in the group is named as staying',
);
await eye('Show', 'Hat');
const partly = await allAlone();

check(partly.hair !== onOther.hair, 'the shown layer moves');
check(partly.hat === onOther.hat, 'and the hidden one stays');

await frameAction(page, 'Duplicate frame');
await page.waitForTimeout(100);
check((await picked()) === 'Hat,Hair', 'the group carries to the new frame');
// the Move tool shows the frames beside this one, which would change this frame's pixels
await page.keyboard.press('b');
await selectFrame(page, 0);
const firstFrame = await pixels();

await selectFrame(page, 1);
await page.keyboard.press('t');
await drag([41, 30], [46, 35]);
await page.keyboard.press('b');
await selectFrame(page, 0);
check((await pixels()) === firstFrame, 'a group moves only in the frame being edited');

// fingers have no ⌘ or Shift to hold: a switch in Layers does what they do
const several = page.locator('#pick-several');

await row('Art').click();
await several.click();
await row('Hat').click();
check((await picked()) === 'Hat,Art', 'with Pick several on, a plain click picks one more layer');
await row('Hat').click();
check((await picked()) === 'Art', 'and a second click lets it go');
await several.click();
await row('Hair').click();
check((await picked()) === 'Hair', 'switched off, a click picks one layer again');

// Duplicate, Clear and Delete took only the layer being edited, with several picked together
const rows = () => page.locator('.layer-row').count();
const pickTwo = async () => {
  await row('Art').click();
  await row('Hat').click({ modifiers: ['Meta'] });
};
const undo = async () => {
  await page.keyboard.press('Meta+z');
  await page.waitForTimeout(150);
};
const had = await rows();

await pickTwo();
await page.getByRole('button', { name: 'Duplicate 2 layers' }).click();
await page.waitForTimeout(150);
check((await rows()) === had + 2, 'Duplicate copies every layer picked together');
await undo();
check((await rows()) === had, 'in one undo step');
check((await picked()) === 'Hat,Art', 'which picks again the layers that were picked');

await pickTwo();
// the Pencil draws no handle over the art
await page.keyboard.press('b');
const drawn = await pixels();

await page.getByRole('button', { name: 'Clear 2 layers in this frame' }).click();
await page.waitForTimeout(150);
check((await pixels()) !== drawn, 'Clear empties the layers picked together');
await undo();
check((await pixels()) === drawn, 'and one undo brings their art back');
await page.keyboard.press('Meta+Shift+z');
await page.waitForTimeout(150);
const cleared = await allAlone();

check(cleared.art === cleared.hat && cleared.hair !== cleared.art, 'each of them, not one');

await pickTwo();
await page.getByRole('button', { name: 'Delete 2 layers' }).click();
await page.waitForTimeout(150);
check(
  (await rows()) === had - 2 && (await picked()) === 'Hair',
  'Delete takes every layer picked, and leaves the next one in hand',
);
await undo();
check((await rows()) === had, 'and one undo brings them back');

// Merge down took the layer in hand and the one under it, whichever were picked
await pickTwo();
await page.keyboard.press('b');
const apart = await pixels();

await page.getByRole('button', { name: 'Merge 2 layers into one' }).click();
await page.waitForTimeout(150);
check(
  (await rows()) === had - 1 && (await picked()) === 'Art',
  'Merge makes one layer of the layers picked together',
);
await undo();
check((await rows()) === had && (await pixels()) === apart, 'and one undo parts them again');
await finish();
