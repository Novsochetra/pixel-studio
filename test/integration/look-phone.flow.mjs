// The arcade's sheet on a phone: a window rides up from the bottom edge, and is pulled down by
// its bar to close it.
import { fingers, openStudio } from './harness.mjs';
import { openDock, openExample, openWorkspace } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
await openExample(page);
const touch = await fingers(context, page);
const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
const openSheet = async () => {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: /Canvas size/ }).click();
  await page.waitForTimeout(700);
};
// a finger on the window's bar, drawn down by so many pixels over a third of a second
const pullDown = async (distance) => {
  const head = await page.locator('.sheet-head').boundingBox();
  const [x, y] = [head.x + head.width / 3, head.y + 14];

  await touch('touchStart', [[x, y]]);

  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', [[x, y + (distance * i) / 10]]);
    await page.waitForTimeout(30);
  }

  await touch('touchEnd', []);
  await page.waitForTimeout(150);
};

await openSheet();
const sheet = await page.locator('.sheet').boundingBox();
check(
  sheet.width === screen.width && Math.abs(sheet.y + sheet.height - screen.height) < 1,
  'a window stands on the bottom edge, as wide as the screen',
);
const grabber = await page.evaluate(() => {
  const mark = getComputedStyle(document.querySelector('.sheet-head'), '::before');

  return { width: mark.width, height: mark.height };
});
check(grabber.width === '36px' && grabber.height === '5px', 'with the grabber on its bar');
await page.screenshot({ path: `${shots}/look-phone-sheet.png` });

await pullDown(40);
await page.waitForTimeout(400);
const settled = await page.locator('.sheet').boundingBox();
check(
  (await page.locator('.sheet').count()) === 1 && Math.abs(settled.y - sheet.y) < 1,
  'pulled down a little and let go, it springs back',
);

await pullDown(sheet.height * 0.6);
check((await page.locator('.sheet').count()) === 0, 'pulled down far, it closes');
await page.waitForTimeout(700);
check(
  (await page.locator('.sheet-out, .sheet-backdrop-out').count()) === 0,
  'and is taken away once it has slid off',
);

await openSheet();
await page.locator('.sheet-close').tap();
check((await page.locator('.sheet').count()) === 0, 'its × still closes it with a tap');

// the bar keeps one row and the workspace's name whole, down to the narrowest phone
await openWorkspace(page, 'Views board');
const picked = () =>
  page.locator('.workspace-pick span').evaluate((name) => ({
    text: name.textContent,
    whole: name.scrollWidth <= name.clientWidth,
  }));
check(
  (await picked()).text === 'Board' && (await picked()).whole,
  'the workspace is named in one word, whole',
);
await page.setViewportSize({ width: 320, height: 640 });
await page.waitForTimeout(300);
check(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  'on a 320 px phone the bar still fits the screen',
);
check((await picked()).whole, 'and the workspace keeps its name whole');

// every view plays in the room above the frames, cut to the art, with nothing to scroll to
await page.setViewportSize({ width: 412, height: 839 });
await openWorkspace(page, 'Edit');
await openDock(page, 'Frames');
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(400);
const spill = await page.locator('.edit-scroll').evaluate((area) => ({
  across: area.scrollWidth - area.clientWidth,
  down: area.scrollHeight - area.clientHeight,
}));
check(spill.across <= 0 && spill.down <= 0, 'all views play within the screen, none off its edge');
await page.screenshot({ path: `${shots}/look-phone-play.png` });
await page.getByRole('button', { name: 'Pause' }).click();

// a frame's menu keeps under the bar at the top and inside the window, with every item in it:
// kept to the room above its frame, its last items were cut off
await page.locator('.cell.selected').click();
const menu = await page.locator('.menu').boundingBox();
const bar = await page.locator('#toolbar').boundingBox();
const cut = await page.locator('.menu').evaluate((list) => list.scrollHeight - list.clientHeight);
check(
  menu.y >= bar.y + bar.height && menu.y + menu.height <= 839,
  'a tall menu stays between the bar at the top and the foot of the window',
);
check(cut <= 0, 'and shows every one of its items');
await page.keyboard.press('Escape');

// the studio's own slider, the same in every browser, tinted up to its knob
await openDock(page, 'Brush');
const size = await page.locator('#brush-size').evaluate((field) => ({
  look: getComputedStyle(field).appearance,
  filled: field.style.getPropertyValue('--filled'),
}));
check(size.look === 'none' && size.filled === '0%', 'a slider is drawn the studio’s way');
await page.locator('#brush-size').evaluate((field) => {
  field.value = field.max;
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
check(
  (await page
    .locator('#brush-size')
    .evaluate((field) => field.style.getPropertyValue('--filled'))) === '100%',
  'and its track is tinted up to the knob',
);
await openDock(page, 'Brush');

// a scene zoomed past the screen scrolls; its controls stay where they can be reached
await openWorkspace(page, 'On the pitch');
await page.waitForTimeout(600);
// the scene is wider than a phone: it opened on its corner, the art being previewed out of sight
const middle = () =>
  page.locator('.stage canvas').evaluate((scene) => {
    const box = scene.getBoundingClientRect();

    return (box.left + box.width / 2) / window.innerWidth;
  });
check(Math.abs((await middle()) - 0.5) < 0.1, 'the scene opens on the art being previewed');
// scrolled to the art, the scene took its controls up out of sight: Play was behind the toolbar
const playTop = await page
  .getByRole('button', { name: 'Play', exact: true })
  .evaluate((button) => button.getBoundingClientRect().top);
const underBar = await page
  .locator('#toolbar')
  .evaluate((toolbar) => toolbar.getBoundingClientRect().bottom);
check(playTop >= underBar, 'with Play in sight above it');
// its first look was framed before the pitch's own picture came, on another ground line
const down = () => page.locator('#stage').evaluate((stage) => stage.scrollTop);
const opened = await down();

await page.getByRole('button', { name: '2×' }).tap();
await page.getByRole('button', { name: '1×' }).tap();
await page.waitForTimeout(300);
check((await down()) === opened, 'framed for the scene as it is, feet and all, from the first');
await page.getByRole('button', { name: '3×' }).tap();
await page.waitForTimeout(300);
check(Math.abs((await middle()) - 0.5) < 0.1, 'and stays on it when zoomed in');
await page.locator('#stage').evaluate((stage) => stage.scrollTo(300, 0));
await page.waitForTimeout(400);
const play = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox();
const zooms = await page.getByRole('group', { name: 'Zoom' }).boundingBox();
const wide = await page.evaluate(() => innerWidth);
check(
  play.x >= 0 && play.x + play.width <= wide && zooms.x >= 0 && zooms.x + zooms.width <= wide,
  'zoomed to 3× and swiped sideways, the preview’s controls are still on the screen',
);
check(
  (await page.locator('.stage canvas').evaluate((scene) => getComputedStyle(scene).touchAction)) !==
    'none',
  'and a finger on the scene scrolls it',
);
await page.screenshot({ path: `${shots}/look-phone-pitch.png` });
await page.getByRole('button', { name: '1×' }).tap();

// the narrowest phone: the workspace keeps its word whole, the board's choices start in reach
await page.setViewportSize({ width: 320, height: 568 });
await openWorkspace(page, 'Views board');
const narrow = await page.evaluate(() => {
  const word = document.querySelector('.workspace-pick span');
  const [first] = document.querySelectorAll('.board-row .segmented button');

  return {
    cut: word.scrollWidth - word.clientWidth,
    first: first.getBoundingClientRect().left,
    spill: document.documentElement.scrollWidth - window.innerWidth,
  };
});
check(narrow.cut <= 0, 'on the narrowest phone the workspace’s name is whole');
check(narrow.first >= 0, 'and the first choice of a row too wide for it is in reach');
check(narrow.spill <= 0, 'with nothing off the screen’s edge');
await page.screenshot({ path: `${shots}/look-phone-narrow.png` });
await page.setViewportSize({ width: 412, height: 839 });

// which part a tap pins was chosen in the frames' bar alone, shut on a phone: every tap moved
// the head
await openWorkspace(page, 'Edit');
await page.locator('#rail [aria-label^="Pin a body part"]').evaluate((button) => button.click());
check(
  (await page.locator('.pin-bar #pin-name').count()) === 1,
  'the Pin tool brings the part to pin over the canvas',
);
await page.locator('#pin-name').selectOption('Hand');
const art = await page.getByLabel('Pixel canvas').boundingBox();

await page.touchscreen.tap(art.x + art.width * 0.3, art.y + art.height * 0.3);
await page.waitForTimeout(500);
check(
  await page.locator('.pin-bar').getByRole('button', { name: 'Remove pin' }).isEnabled(),
  'and the part picked there is the one a tap pins',
);
await page.screenshot({ path: `${shots}/look-phone-pin.png` });

// the colours of a swap are a long list on a phone: the picture of what a pick does stays in
// sight above them, under the window's title and not behind it
await openDock(page, 'Colours');
await page.getByRole('button', { name: 'Swap colours…' }).tap();
await page.waitForTimeout(500);
await page
  .locator('.sheet')
  .getByRole('group', { name: 'Starter palettes' })
  .getByRole('button')
  .first()
  .tap();
await page.waitForTimeout(400);
await page.locator('.sheet').evaluate((swap) => swap.scrollTo(0, 900));
await page.waitForTimeout(300);
const pinned = await page.evaluate(() => {
  const picture = document.querySelector('.sheet figure canvas').getBoundingClientRect();
  const head = document.querySelector('.sheet-head').getBoundingClientRect();
  const swap = document.querySelector('.sheet');

  return {
    under: picture.top - head.bottom,
    inSight: picture.bottom < window.innerHeight / 2,
    spill: swap.scrollWidth - swap.clientWidth,
  };
});
check(
  pinned.under >= 0 && pinned.inSight && pinned.spill <= 0,
  'the swap’s picture stays under the title while its colours scroll',
);
await page.screenshot({ path: `${shots}/look-phone-swap.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await openDock(page, 'Colours');

// a swipe that began on a frame's picture scrolled the frames sideways only: with every view
// shown, the rows below could not be reached from it
await openDock(page, 'Frames');
check(
  (await page
    .locator('.cell')
    .first()
    .evaluate((cell) => getComputedStyle(cell).touchAction)) === 'pan-x pan-y',
  'a swipe that begins on a frame scrolls the frames either way',
);
await openDock(page, 'Frames');

// Safari tells of a pinch with an event of its own, and zooms the page unless it is refused
check(
  await page.evaluate(
    () => !document.dispatchEvent(new window.Event('gesturestart', { cancelable: true })),
  ),
  'Safari’s own pinch of the page is refused',
);

// a message is as wide as its words, not half the screen
await openWorkspace(page, 'Edit');
await page.locator('#rail [aria-label^="Select and move"]').evaluate((button) => button.click());
const said = await page.locator('.toast').boundingBox();
check(said.width > 200 && said.height < 80, 'a message spreads across the screen');

// cut into parts, the Pose tool's bar is wider than a phone: centred, its first controls were
// out of the scroll's reach, and the cut window's own buttons were a long scroll down
await page.locator('#rail [aria-label^="Pose"]').evaluate((button) => button.click());
await page
  .locator('.pose-bar')
  .getByRole('button', { name: /Cut into parts/ })
  .tap();
await page.waitForTimeout(600);
const foot = await page.locator('.sheet .sheet-actions').boundingBox();
check(
  foot.y > 400 && foot.y + foot.height <= 840,
  'the cut window keeps its buttons at the foot of the screen',
);
await page.locator('.sheet .btn.primary').tap();
await page.waitForTimeout(800);
const firstControl = await page.locator('.pose-bar > :first-child').boundingBox();
check(firstControl.x >= 0, 'the Pose bar starts at its first control, the rest a scroll away');
await finish();
