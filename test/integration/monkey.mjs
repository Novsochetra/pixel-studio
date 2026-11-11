// Every button in every workspace, panel and dialog clicked in turn, for each kind of project: the
// page must never throw. Shared by the desktop and phone runs.
import { createProject, isCompact, openExample, openWorkspace } from './studio.mjs';

// Close this panel: a phone's panel is a sheet with a way out, and shut it has no buttons to click
const SKIP =
  /Delete|Clear marks|Go back|Wear it|Apply to|Use them all|Use for|Forget|Remove|Close this panel/;
// the workspace buttons are left alone, so each workspace's own panels are clicked through
const TOOLBAR_SKIP =
  /Download|History|^\?$|PIXEL|^Edit$|Views board|On the pitch|^Preview$|^More$|^Workspace/;
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

async function workspaceNames(page) {
  if (!(await isCompact(page))) {
    return page.locator('#toolbar .segmented[aria-label="Workspace"] button').allTextContents();
  }

  await page.getByRole('button', { name: /^Workspace/ }).click();
  const names = await page.getByRole('menuitemcheckbox').allTextContents();
  await page.keyboard.press('Escape');

  // the open workspace's item carries its tick
  return names.map((name) => name.replace('✓', '').trim());
}

// a phone shows the panels one at a time, from the dock: each is opened and clicked through
async function everyPanel(run) {
  const { page } = run;
  const tabs = await page.locator('.dock-tab').allTextContents();

  for (const tab of tabs) {
    await page.locator('.dock-tab', { hasText: tab }).click();
    await page.waitForTimeout(150);
    await clickAll(run, '#stage');
    await clickAll(run, '#inspector');
  }
}

async function everyWorkspace(run) {
  const { page } = run;

  await page
    .locator('.section[data-collapsed="true"] > h2')
    .evaluateAll((titles) => titles.forEach((title) => title.click()));

  for (const mode of await workspaceNames(page)) {
    await openWorkspace(page, mode);

    for (const scope of ['#toolbar', '#rail', '#stage', '#inspector']) {
      await clickAll(run, scope, scope === '#toolbar' ? TOOLBAR_SKIP : SKIP);
    }

    await everyPanel(run);
  }

  await openWorkspace(page, 'Edit');
}

async function openDialog(page, [panel, opener, item]) {
  if (panel) {
    await page
      .locator('.dock-tab[aria-pressed="false"]', { hasText: panel })
      .click({ timeout: 1000 })
      .catch(() => {});
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

    await everyWorkspace(run);
    await everyDialog(run);
  }

  await page.keyboard.press('Meta+z');
  await page.keyboard.press('Meta+Shift+z');
  check(run.clicks > 300, `${run.clicks} clicks across every kind, workspace and dialog`);
}
