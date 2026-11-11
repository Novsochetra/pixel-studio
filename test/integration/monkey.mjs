// Every button in every bar, panel and dialog clicked in turn, for each kind of project: the
// page must never throw. Shared by the desktop and phone runs.
import { createProject, openDock, openExample } from './studio.mjs';

// A phone's panel is a sheet with a way out and a row that picks another panel: shut, or
// changed for another, it would not have the buttons still to click.
const SKIP =
  /Delete|Go back|Wear it|Apply to|Use them all|Use for|Forget|Remove|Close this panel|^(Frames|Colours|Brush|Layers|Outline|Guides)$/;
const TOOLBAR_SKIP = /Download|History|^\?$|PIXEL|^More$/;
// [panel of the dock that holds the opener on a phone, the opener, the item of its menu]
const DIALOGS = [
  ['Colours', 'Swap colours…', null],
  ['Colours', 'Team kits…', null],
  [null, 'History', null],
  [null, 'Keyboard shortcuts', null],
  [null, 'More', /saved versions/],
  [null, 'Download', /Sprite sheet/],
  [null, 'Download', /Prompt and reference/],
  ['Frames', 'New animation', null],
];

async function closeAll(page) {
  for (let i = 0; i < 3; i++) {
    if (await page.locator('.sheet-backdrop').count()) {
      await page.keyboard.press('Escape');
    }
  }

  await page.locator('.menu').evaluateAll((menus) => menus.forEach((menu) => menu.remove()));
}

async function clickAll(run, scope, skip = SKIP) {
  const { page } = run;
  const buttons = page.locator(`${scope} button:visible`);
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);

    if (!(await button.count())) {
      break;
    }

    const name = (
      (await button.getAttribute('aria-label')) ||
      (await button.textContent()) ||
      ''
    ).trim();

    if (skip.test(name) || (await button.isDisabled().catch(() => true))) {
      continue;
    }

    await button.click({ timeout: 2000 }).catch(() => {});
    run.clicks += 1;
    await page.waitForTimeout(50);

    if (scope !== '.sheet') {
      await closeAll(page);
    }
  }
}

// a phone shows the panels one at a time, from the dock: each is opened and clicked through
async function everyPanel(run) {
  const { page } = run;
  const tabs = await page.locator('.dock-tab').allTextContents();

  for (const tab of tabs) {
    await openDock(page, tab);
    await page.waitForTimeout(150);
    await clickAll(run, '#stage');
    await clickAll(run, '#inspector');
  }
}

async function everyBar(run) {
  const { page } = run;

  await page
    .locator('.section[data-collapsed="true"] > h2')
    .evaluateAll((titles) => titles.forEach((title) => title.click()));

  for (const scope of ['#toolbar', '#rail', '#stage', '#inspector']) {
    await clickAll(run, scope, scope === '#toolbar' ? TOOLBAR_SKIP : SKIP);
  }

  await everyPanel(run);
}

async function openDialog(page, [panel, opener, item]) {
  if (panel) {
    await openDock(page, panel).catch(() => {});
  }

  await page
    .getByRole('button', { name: opener, exact: opener === 'More' })
    .first()
    .click({ timeout: 2000 })
    .catch(() => {});

  if (item) {
    await page
      .getByRole('menuitem', { name: item })
      .click({ timeout: 2000 })
      .catch(() => {});
  }
}

async function everyDialog(run) {
  const { page } = run;

  for (const dialog of DIALOGS) {
    await openDialog(page, dialog);
    await page.waitForTimeout(250);
    await clickAll(
      run,
      '.sheet',
      /Delete|Go back|Wear it|Apply to|Close|Cancel|Done|OK|Create|Forget/,
    );
    await closeAll(page);
  }
}

async function newKind(page, kind) {
  await page.locator('button.wordmark').click();
  await page.locator('.start-section').evaluate((details) => {
    details.open = true;
  });
  await createProject(page, { kind });
}

export async function monkey({ page, check }) {
  const run = { page, clicks: 0 };

  await openExample(page);

  for (const kind of [null, 'Tiles', 'Effect', 'Character']) {
    if (kind) {
      await newKind(page, kind);
    }

    await everyBar(run);
    await everyDialog(run);
  }

  await page.keyboard.press('Meta+z');
  await page.keyboard.press('Meta+Shift+z');
  check(run.clicks > 150, `${run.clicks} clicks across every kind, panel and dialog`);
}
