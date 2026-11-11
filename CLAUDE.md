# Project rules

Pixel Clean Studio: turns AI pixel art into true pixel art, then edits, animates and exports it for
any game. One page, built from `src/` by `build/build.py`. The rules are the fighting-games repo's
(`Novsochetra/fighting-games`, its `CLAUDE.md`), fitted to one page with no framework.

## Commands

| Command          | What it runs                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| `npm run serve`  | builds the page and serves it on http://localhost:8811/wrapped.html      |
| `npm run check`  | lint, format check, unit and regression tests, the build, every flow     |
| `npm run lint`   | ESLint (`eslint.config.js`, local rules in `tools/eslint-rules/`)        |
| `npm run format` | Prettier, writes files                                                   |
| `npm test`       | the unit and regression tests, and the tests of `tools/` (`node --test`) |
| `npm run build`  | `dist/index.html`; the build refuses import cycles and missing exports   |

## Coding

- Simplest solution that works. Small files and functions with one job each. Lint enforces size and
  complexity limits (150 lines a file, 40 lines a function, complexity 10, depth 3, 4 parameters);
  split code instead of raising limits. Group related arguments into one object (`{ x, y }`,
  `{ width, height }`).
- Put code where it belongs (see "Where a file goes"). No god objects, god functions or god files.
- No comments that say what code does. Only write a comment to explain **why** something
  non-obvious is done (workarounds, browser quirks, a rule of the art). If deleting the comment
  loses nothing a reader can't get from the names and the code, delete it:
  `// the projects list follows each save` over `afterSave` goes;
  `// claude.ai hands documents back frozen, so the page works on its own copy` stays.
- Lint enforces this for `/** */` and `/* */` blocks (`local/no-jsdoc-blocks` in
  `eslint.config.js`) and for section banners (`local/no-banner-comments`): write a why as a short
  `//` comment. A stylesheet may open with one `/* */` line saying what part of the page it styles.
- A Claude Code hook (`.claude/settings.json`, `tools/claude-hooks/`) shows Claude each comment an
  edit or a commit adds, so it deletes the what-comments before going on.
- No `TODO` / `FIXME` comments (`no-warning-comments`). Put follow-up work in the tracker as an
  issue.
- No raw hex colours in the page's code (`local/no-raw-hex`): the page's colours are tokens in
  `src/ui/styles/00-tokens.css`, read with `cssVar()`; colours painted as pixel art (the example's
  palette, the checkerboard, pins) are data and live only in `src/art/`.
- Put logic in plain functions with unit tests. `src/ui` stays thin: it builds elements with
  `node()` and calls those functions.
- What a project makes is data: kinds in `src/model/kinds.js`, game presets in
  `src/model/presets.js`. Nothing outside them names a game.
- Never install packages without asking.

## Code style

- Write self-explaining code: descriptive names, no single-letter names except `x`, `y`, `i`, `j`.
- Keep comments minimal: no comments that restate the code, no section-banner comments, no long
  JSDoc on obvious functions.
- Prettier owns formatting (`.prettierrc.json`), but it never adds a blank line, so space code into
  steps yourself. Put a blank line:
  - after the setup (the `const`s that gather what a function needs), before its logic,
  - after a block (`if`, `for`, `try`, `switch`) that closes with `}` when more code follows,
  - after an early return (`if (!frame) { return null; }`),
  - before the final `return`, unless it is the only line of the function,
  - between the methods of an object.

  Never put one right after `{` or right before `}`. Blank lines don't count toward the lint size
  limits (`skipBlankLines` in `eslint.config.js`).

  ```js
  export function portraitOf(project) {
    const frame = portraitFrame(project);

    if (!frame) {
      return null;
    }

    const sprite = compositeFrame(frame, project.canvas.width, project.canvas.height);
    const box = bounds(sprite);

    return box ? cropped(sprite, box) : null;
  }
  ```

## Where a file goes

`src/` holds:

- `model/`: what a project is and plain changes to it (projects, kinds, presets, animations,
  frames, layers, sprites, the cast),
- `clean/`: the cleaner, a pixel-exact port of `tools/pixel_clean.py`, run in `worker/`,
- `editor/`, `palette/`, `export/`, `views/`: drawing tools and history, colours, what leaves the
  studio (sheets, manifests, game packs, prompts), guides and filters,
- `io/`: file formats and the browser's images, zips and GIFs,
- `store/`: saved work: the backends, each project's documents, the projects list and its folders,
  pictures, versions, presets,
- `art/`: colours painted as pixel art,
- `ui/`: the page. One folder per feature (`grid/`, `start/`, `import/`, `projects/`,
  …), a part two features share at its top, `styles/` and `page.html`.

Where a file goes:

1. It builds elements or reads the page: `ui/`, in its feature's folder.
2. It reads or writes saved work: `store/`.
3. It reads or writes a file format, or needs the browser's canvas or images: `io/`.
4. Everything else is plain logic in the folder of what it is about.

No catch-all folders (`helpers/`, `utils/`, `constants/`): a constant lives with its owner.
`test/unit/layout.test.js` holds `src/` to these folders and fails when anything outside `ui/`
imports `ui/`, anything but `ui/` imports `store/`, anything but `store/`, `ui/` and `worker/`
imports `io/`, or `clean/` or `art/` import anything outside themselves.

## The page at every size

- `src/ui/layout.js` names the window's size: `compact` (a phone held either way, a small tablet),
  `medium` or `wide`. It is on the page's root (`:root[data-layout]`) for the stylesheets and in
  the state (`layout`) for the bars, so the two never disagree: the editor's layout never asks the
  window's width with a media query of its own.
- On `compact` only the canvas scrolls. The frames and each of the inspector's panels open one at a
  time from the dock (`dock.js`); the toolbar keeps one row, and what does not fit waits in the
  More menu (`toolbar-menu.js`). Something new in the inspector or the toolbar needs its place
  there too.
- A phone held upright has the look of its own system (`71-phone-sheets.css`): one bar floats
  at the screen's foot, the tools', a capsule with round tools in it, and beside it two round
  buttons, the colour in hand and Panels (`dock.js`). There is no second bar of tabs: a panel
  is a sheet at the screen's foot, and the row at the sheet's top names it and picks another
  (`panel-sheet.js`, the panels themselves in `panels.js`), beside a ×. The sheet is pulled by
  its whole top: up makes it tall (`data-sheet='tall'`), down brings it back, then shuts it.
  The sheet still takes its row: the canvas is fitted in the room above it, never under it;
  only a sheet pulled tall, for a long list, lies over the canvas until it is pulled back.
  What stays put in a panel while it scrolls is painted in `--sheet` there. On its side the
  phone keeps a tab for each panel at the screen's edge.
- The phone's bar shows its tools as bare pictures, a few at a time: All tools, at its end,
  opens every one with its name (`tools-panel.js`). A new tool in `tool-list.js` is in both.
- Off a phone the frames stand under the canvas, as tall as the line above them is dragged
  (`grid/grid-resizer.js`, `--grid-height`); on `compact` they are a sheet, with no line.
- Fit shows the whole canvas, at a whole zoom. A canvas that would be shown at its own size
  takes a step more when the stage's margins are all that stop it, and the stage gives them up
  (`fitZoom`, `.stage-inner.tight`): its last rows are never under the frames.
- Two fingers never zoom the page (`touch-action` on `html`): they zoom the canvas, on the art or
  on the stage beside it (`stage-beside.js`). While they hold it the canvas is moved and sized as
  a picture (`pinch.js`), and drawn again once, at the whole zoom nearest, when they let go:
  nothing in the store changes at a finger's move, as drawing the stage each time lagged. A tool that acts at a press (Fill, Replace colour)
  acts as the pointer lets go (`onRelease`), so the first finger of a pinch fills nothing.
- A finger has no pointer to hover and no keys: a control's meaning cannot live only in a tooltip
  or a shortcut. What Shift or Alt does to a tool has a control too (Even shapes and Darker shades
  in Drawing; Add, Take away and Everywhere on the selection's bar; Pick several in Layers), and what a tool says when it
  is picked is worded for the hands that picked it (`touch` in `tool-list.js`, `forHands`). One finger on the canvas waits a moment before its tool acts
  (`touch-intent.js`), as it may be the first of a pinch.

## The look

- The look is the arcade's (`Novsochetra/fighting-games`, `apps/web/arcade/src/styles/`): its
  greys and blue, glass and pills, Inter, and its motion. All of it is tokens in
  `src/ui/styles/00-tokens.css` (`--glass`, `--shadow-glass`, `--material`, `--radius-*`,
  `--duration-*`, `--ease-*`, `--scale-pressed`); a stylesheet names no duration or easing of its
  own. Silkscreen is kept for the studio's name only.
- A button is `.btn`, a pill of glass that gives under the press. `.primary` is the one thing a
  view is for, in the page's ink, as the arcade's Play; `.quiet` is bare until pointed at; `.on` is
  a switch that is on, in the tint. Its height is `--btn-height` and its corners are half of that,
  so a label that wraps makes a round-cornered box, not a lozenge: set `--btn-height`, never a
  `min-height` or a radius. What floats over the art (a menu, a message, the bars over the
  canvas) is frosted `--material`; a bar in the frame is plain `--chrome`.
- What says more is behind an edge (the phone's tool strip, the folders) is a strip that stays
  at that edge (`::after`, `position: sticky`), never a mask on the bar: a mask fades the bar
  itself into the page. A row that scrolls sideways (a bar over the canvas on a phone or in a
  short window, a row of choices) is watched by `watchMore` (`src/ui/more-behind.js`), which
  marks it while more waits and lets a mouse's wheel move along it.
- A window that holds more than one job shows them as pages, one in sight at a time, under a
  row that names them: Projects is All projects, This project and New project
  (`projects/project-pages.js`). Everything on one sheet was more than could be taken in.
- What a window lists is a list as a phone has them. Things of one kind (the projects) are
  rows under one another: a picture, a name, a line about it, and what marks the one in hand
  at the row's end (`projects/project-row.js`). What a thing is and what can be done with it
  (This project) is grouped rows on a rounded ground, a heading above and a note below
  (`projects/list-group.js`, `56-lists.css`): a row that says something has its value at its
  end, a row that does something is in the tint, and one that leads to another window ends
  in a chevron.
- What closes leaves through `leave()` (`src/ui/leave.js`) under an `-out` class
  (`.sheet-out`, `.menu-out`, `.toast-out`), so the page and the flows count it gone at once
  while it plays out: style both with `:is(.sheet, .sheet-out)`.
- The bars are drawn again on every change, so nothing in them animates as it is made: an
  entrance is for what is shown once (a window, a menu, a panel opened from the dock). A
  segmented control's thumb slides because `segmented-thumb.js` remembers where the last one
  stood, by the control's `aria-label`: give every `.segmented` one.
- The tint is for fills and rings; as words or an icon on the page it is `--tint-text`, which
  can be read on both themes.
- `90-motion.css` holds the keyframes and turns every transition and animation off for someone
  who asked for less motion; `look.flow.mjs` and `look-phone.flow.mjs` hold the look to this.

## Fields, drags and undo

- A field says it has changed as it loses focus, in the middle of the press that took the focus.
  When that change draws a list or a window again, it goes through `afterPress`
  (`src/ui/after-press.js`): the redraw waits for the press's click and the click is passed on to
  the control now in its place. Redrawn at once, the button pressed is gone before its click.
- What a drag on the canvas returns has `cancel()` when its work can be taken back, as a second
  finger makes the drag a pinch; without one it is ended and kept as a step. Undo and redo wait
  while a drag is under way.
- A step that moves the selection with the pixels (a move, a turn, a paste) is made with
  `commitSelected`, so undo puts the selection back too. A change that changes nothing records no
  step (`History.recordStructure` says whether it did).
- A step that moves the editor to another frame, layer or animation remembers both places
  (`restructure` does it): undo goes back to where it was made from, redo to where it led. A
  change to the project's own settings (guides, palettes) is a step too
  (`recordSetting`).
- What undo cannot bring back (a project, a folder, a saved version, a preset) asks before it
  goes, the same way everywhere: where the thing stood, a question with Delete and Keep
  (`askDelete` in `src/ui/ask-delete.js`; a project's card asks the same). What undo can bring
  back does not ask. A window holding work that is no step yet (the cut window's corrections)
  asks the same way before it closes (`mayClose` in `openSheet`).
- A whole project put in the open one's place (a canvas of another size, a version gone back to)
  is one step too (`restoreProject`, `History.recordProject`): the undo history is kept across
  it, and undo swaps the project back (`swapProject`).
- The view a project is left on (view, frame, tool, colour) is kept for the next visit
  (`view-kept.js`): something new in the state that is how the editor is showing things joins
  `VIEW` there.
- A download carries the project's name (`fileSlug(project.name)`), and art with one view names
  no view in its files (`downloadName`, `viewFileName`).
- What is typed is checked where it is read: a number is kept to what can be (`wholeNumber`), and
  a message to a person never carries an exception's own words.
- The bars are drawn again at every change, so the page keeps the keys for someone using them
  (`keepFocus` in `src/ui/keep-focus.js`, round every redraw in `app.js`, and round a panel
  that draws itself, as the frames do while they play): the control now in the place of the one
  used takes the focus, found by its id, its `aria-label` or its words, or where it stood when
  its name changes as it is used (Play to Pause). After a click the keys stay the editor's own
  (`:focus-visible`). A field edited says its change before Tab moves on, and Enter in a field
  clicked into, or Escape in any, gives the keys back to the editor's shortcuts
  (`field-keys.js`).
- A canvas is sized for the room it has, never shrunk by the stylesheet (`viewBox` in
  `src/ui/body/cut-view.js`): squashed, its art is out of shape and a press lands beside the
  finger.
- What a shortcut does has a control where there are no keys (`hasKeyboard`), at every layout: a
  tablet held wide has the desk's bar and a finger's hands (Paste in its More menu or its bar).

## Testing

- Unit tests are not enough. Each change needs the right mix of:
  - **unit** tests (`test/unit/`) for plain functions. The cleaner must stay pixel for pixel the
    same as `tools/pixel_clean.py` (`clean.test.js`, fixtures from `test/make_fixtures.py`),
  - **integration** flows (`test/integration/*.flow.mjs`): the built page in a browser, each flow
    stating what must be true with `check()`; `run.mjs` runs them all, the monkey clicks everything,
  - **regression** tests (`test/regression/`): one test per fixed bug, saying what went wrong.
- The flows run in Chromium, and on Safari's engine with `STUDIO_BROWSER=webkit` (see the README).
  A finger's drag comes from `fingers` in `harness.mjs`, never from Chromium's tools directly: it
  is a real touch in Chromium and hand-made pointer events elsewhere, so the flow runs on both.
  Only what no other browser can say at all (what stops an install) is behind `onChromium`.
- Fixing a bug: first write a test that reproduces it and fails, then fix it, then keep the test.
- Verify your work: run `npm run check`, and look at UI changes in a browser (the flows save
  screenshots in `shots/`).

## Versions

The studio's version is SemVer, the `version` in `package.json`. Raise it without being asked, in
the change that ships something people using the studio see:

- `npm version patch --no-git-tag-version` for fixes and small changes to how something looks or
  reads,
- `npm version minor --no-git-tag-version` for something new: a tool, a sheet, a kind, an export,
- `npm version major --no-git-tag-version` only for a change that breaks what people keep (saved
  work, project files, presets), and only once the user agrees.

A change nobody using the studio sees (tests, docs, tooling, a refactor) keeps the version. A branch
raises it once, by the most its change needs, over the version on `main` as it merges; say in the
reply which version it now is.
