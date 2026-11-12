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
| `npm run mcp`    | the MCP server Claude Code edits project files through (`.mcp.json`)     |

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
  The strip of canvas above a tall sheet takes no stroke, and Play brings the sheet back to
  its height (`lowerTallSheet`). On the shortest phones (568px) the frames' sheet finds room
  for a whole row of frames in itself (less air at its top, smaller frames), never in the
  canvas's room, and on the narrowest (320px) the frame rate stands a row down, so the tabs
  have the first row.
  With a sheet up the room under the canvas is kept for the bar of a selection, a pose or a
  pin, and a message shows across the sheet's top edge: neither lies over the art.
  What stays put in a panel while it scrolls is painted in `--sheet` there. On its side the
  phone keeps a tab for each panel at the screen's edge.
- The phone's bar shows its tools as bare pictures, a few at a time: All tools, at its end,
  opens every one with its name (`tools-panel.js`). A new tool in `tool-list.js` is in both.
- Off a phone the frames stand under the canvas, as tall as the line above them is dragged
  (`grid/grid-resizer.js`, `--grid-height`); on `compact` they are a sheet, with no line.
- Fit shows the whole canvas, at a whole zoom, or at a half where the canvas is larger than the
  window, or a quarter where the half does not fit either: the largest canvas with a phone's
  sheet up (`nearestZoom`, `steppedZoom` in `navigate.js`). Only such a canvas has the half or
  the quarter (`leastZoom`): a small one pinched down to them was a thumbnail.
- With no band above the canvas and room beside it (a laptop's short window, a phone held on its
  side), the selection's bar is a card in the stage's corner, clear of the art
  (`selection-beside.js`, `72-selection-beside.css`). On a phone held on its side the bars of a
  pose, a pin and the layers' turn are cards there too (`placeBars`), and with no room beside
  the canvas either the stage keeps room under it, so its last rows scroll out from under the
  bar. With no room beside it either, it stands
  at the end of the canvas the selection is not in. A canvas that would be shown at its own size
  takes a step more when the stage's margins are all that stop it, and the stage gives them up
  (`fitZoom`, `.stage-inner.tight`): its last rows are never under the frames.
- Two fingers never zoom the page (`touch-action` on `html`): they zoom the canvas, on the art or
  on the stage beside it (`stage-beside.js`). While they hold it the canvas is moved and sized as
  a picture (`pinch.js`), and drawn again once, at the whole zoom nearest, when they let go:
  nothing in the store changes at a finger's move, as drawing the stage each time lagged. A tool that acts at a press (Fill, Replace colour)
  acts as the pointer lets go (`onRelease`), so the first finger of a pinch fills nothing.
- The on-screen keyboard lies over the screen's foot and tells the page only how much of it is
  still in sight: what it covers is `--keyboard` on the root (`keyboard-room.js`), and a window
  at the screen's foot stands above it. No test can raise real keys: `phone-turned.flow.mjs`
  shortens the part of the page in sight as they would.
- A finger has no pointer to hover and no keys: a control's meaning cannot live only in a tooltip
  or a shortcut. What Shift or Alt does to a tool has a control too (Even shapes and Darker shades
  in Brush; Add, Take away and Everywhere on the selection's bar; Pick several in Layers), and what a tool says when it
  is picked is worded for the hands that picked it (`touch` in `tool-list.js`, `forHands`). One finger on the canvas waits a moment before its tool acts
  (`touch-intent.js`), as it may be the first of a pinch.
- Two fingers tapped together on the canvas undo the last step and three bring it again
  (`finger-tap.js`, `stage-taps.js`): Undo is at the top of a phone's screen, a hand away from
  the art. Fingers that zoomed the canvas a step were a pinch, and undo nothing.
- Under fingers (`95-touch.css`, `pointer: coarse`) nothing pressed is smaller than 40px, or has
  room round it that takes the press, and no words are smaller than 12px. Something new that is
  pressed or read is held to both there.

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
- A window says when more of it waits under the buttons at its foot: a line parts them from
  what goes on below (`marksBelow` in `sheet.js`, `data-below`). A picture in a window keeps to
  a share of a short window's height (`shaped`, `.compare.cleaning`), so what it is shown for
  is in sight beside it.
- A window that holds more than one job shows them as pages, one in sight at a time, under a
  row that names them: Projects is All projects, This project and New project
  (`projects/project-pages.js`). Everything on one sheet was more than could be taken in.
- What is listed is a list as a phone has them. Things of one kind (the projects, the layers)
  are rows under one another: a picture, a name, a line about it, and what marks the one in
  hand. What a thing is and what can be done with it (This project, the inspector's Brush,
  Outline and Guides) is grouped rows on a rounded ground, a heading above and a note
  below (`list-group.js`, `56-lists.css`): `valueRow` says something, `fieldRow` ends in a
  field or a choice, `switchRow` in a switch, and an `actionRow` is pressed, in the tint, with
  a count at its end or the chevron of a window it leads to. A row's words are few: what a
  switch does is its `hint`, which a pointer hovers for and a touch screen shows under the
  name. No loose buttons with sentences on them, no paragraph under a control.
- Pictures are the stroke icons of `icon()` (`dom.js`), chevrons and the × among them: never
  a letter or a triangle from the font, which sits in another weight beside them. A fold's
  chevron turns as it opens, and an inspector section's height is led open and shut
  (`playFold` in `inspector.js`).
- Which views show their frames is one button that names them (`grid/views-menu.js`): "All
  views", or "Front only". An animation with one view has no such button.
- The animation has keys of its own (`animation-keys.js`): Enter plays and pauses with the
  keys on the page, Alt N and Alt D add and copy a frame, Alt O is onion skin, ⌘S saves at
  once. Alt with a letter is read by `event.code`, as a Mac's Option types its own letter. A
  phone that starts playing says a tap on the art stops it.
- A window's keys never start on its ×; one making something starts them on itself
  (`focusField: 'window'`), and puts them on its main button when the result is ready: Enter
  on the × threw a clean away. ⌘S is never the browser's, in a window or a field too.
- Under fingers (`pointer: coarse`) the desk's layout keeps the touch sizes as well: a tablet
  held wide is a desk under fingers. A section's title is a button only where it folds.
- A window open on a desk keeps its top where it opened and grows at its foot (`pinTop` in
  `sheet-pin.js`): centred, a window that drew itself again taller moved up under the pointer,
  and a double-click's second click landed on the field above. A phone's window rises from the
  screen's foot.
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
- A selection that is moved, flipped or turned is lifted off the art once and floats from then
  on (`asFloating`, `moveLifted`, `flipSelection` in `src/editor/floating.js`; a turn's result
  floats too): what it passes over is put back behind it. Never stamp a selection down at each
  key or lift it from the sprite again: that rubbed out the art under it. A quarter turn is a
  turn (`turnSelectionTo`), drawn from the first pixels, so art past the edge comes back.
- One hidden layer is never changed unseen: `commit` refuses, and says why (`refusesPaint` in
  `body/body-lock.js`). A change to many layers at once takes the hidden ones along.
- A handle is taken hold of where it is drawn, reckoned from where the pointer is, not from the
  middle of the pixel under it (`onKnob`): at a high zoom that reached into the art.
- A run of nudges by the arrows, key after key, is one step to undo (`History.joinLast`).
- A step that moves the selection with the pixels (a move, a turn, a paste) is made with
  `commitSelected`, so undo puts the selection back too. A change that changes nothing records no
  step (`History.recordStructure` says whether it did).
- A step that moves the editor to another frame, layer or animation remembers both places
  (`restructure` does it), and the layers picked together there (`placeOf`): undo goes back
  to where it was made from, redo to where it led. A
  change to the project's own settings (guides, palettes) is a step too
  (`recordSetting`).
- A project keeps its undo steps while another is looked at (`historyOf` in `session.js`, the
  last three opened): opened again, it had none. Read again from saved work, a step that swaps
  whole projects is pointed at the project now open (`History.openOn`).
- A save's documents go to the browser's store together and are committed as they are asked
  for (`committed`, `writeAll` in `backends.js`). As the page is left, what the save would write
  is kept first in `localStorage` (`left-unsaved.js`, `Saver.waiting`) and put into the saved
  work on the next visit: a tab closed a moment after a stroke lost the stroke, as a page that
  is gone never hears its write was done. `leaving.flow.mjs` closes the tab and loads the page
  again within that moment.
- What undo cannot bring back (a project, a folder, a saved version, a preset) asks before it
  goes, the same way everywhere: where the thing stood, a question with Delete and Keep
  (`askDelete` in `src/ui/ask-delete.js`; a project's card asks the same). What undo can bring
  back does not ask. A window holding work that is no step yet (the cut window's corrections)
  asks the same way before it closes (`mayClose` in `openSheet`), and takes its own changes
  back while it is open (`cut-steps.js`, `cut-undo.js`): the editor's undo waits behind a window.
- One of the project's named things taken off in a window (a part, an outfit) is a step
  (`takeOff` in `src/ui/put-back.js`), and the window offers it back itself (`putBackRow`);
  removed with the keys, they go to that row (`keysToPutBack`). Its name changed is a step too
  (`rename`).
- A project added and a version saved take a name nothing in their list has (`freeName`): a
  copy made twice is "Hero copy" and "Hero copy 2".
- A whole project put in the open one's place (a canvas of another size, a version gone back to)
  is one step too (`restoreProject`, `History.recordProject`): the undo history is kept across
  it, and undo swaps the project back (`swapProject`).
- The view a project is left on (view, frame, tool, colour) is kept for the next visit
  (`view-kept.js`): something new in the state that is how the editor is showing things joins
  `VIEW` there.
- Under 100% a sprite is made smaller before it is drawn, each square of art keeping a painted
  pixel (`shrinkInto`, `forScale` in `draw.js`): left to the canvas, thin strokes fell on rows
  that were not drawn.
- What runs at every move of the pointer is kept small on the largest canvas (512×512): the
  checkerboard is one tile repeated (`checker.js`), a pass over a sprite's pixels or a
  selection's cells is a plain loop, and an inspector section folded shut draws its title alone
  when its rows cost a pass over the art (`outline-panel.js`). `big-canvas.flow.mjs` counts what
  a move draws, so it says the same on a slow machine.
- A picture cleaned onto a canvas too small for it is made smaller, and the window says so and
  offers the canvas it keeps its own pixels on (`canvasToKeep`, `import/keep-size.js`): never
  shrunk without a word. A height typed is kept to the room the canvas has, and offered the
  canvas it needs, the same way. Art stands on the guide that marks its bottom (Feet, Ground)
  wherever that guide is (`placementOf`), not on the kind's share of the height.
- An icon's or an effect's sprite sheet frame is its canvas, the art where it was drawn ("The
  canvas" in the sheet's sizes): fitted to the art, its frame came out odd sizes, off centre.
- A run of arrow-key nudges of layers with Move is one step to undo, as a selection's is.
- Versions saved by hand in History are the last to go past the limit of 30; those kept on
  their own (before a cleaning, a resize) go first (`versionsKept`).
- A palette added is a step, as one taken off is (`addPaletteStep`). A guide that marks the top
  of a colour follows that colour when it is swapped everywhere, in the same step
  (`History.alsoSetting`). Pins, like guides, stay on a canvas made smaller.
- A picture's view is read from whole words of its name (`namedDirection`): "back" inside
  "background" is no view.
- Palette lock keeps the art's colours and the project's palettes in reach (`palette-lock.js`):
  a palette added is the art's own choice.
- The Canvas size window shows the frame on the canvas asked for as the size is typed
  (`canvas-size-preview.js`); the prompt window starts on the view being edited and asks again
  what was asked last in the project.
- A download carries the project's name (`fileSlug(project.name)`), and art with one view names
  no view in its files (`downloadName`, `viewFileName`). A game's sprite sheet alone is named as
  the game's manifest names it (`sheetFile` in `export-sheet.js`): the window shows that path
  beside it.
- What is typed is checked where it is read: a number is kept to what can be (`wholeNumber`), and
  a message to a person never carries an exception's own words.
- The bars are drawn again at every change, so the page keeps the keys for someone using them
  (`keepFocus` in `src/ui/keep-focus.js`, round every redraw in `app.js`, and round a panel
  that draws itself, as the frames do while they play): the control now in the place of the one
  used takes the focus, found by its id, its `aria-label` or its words, or where it stood when
  its name changes as it is used (Play to Pause). After a click the keys stay the editor's own
  (`:focus-visible`). A field edited says its change before Tab moves on, and Enter in a field
  clicked into, or Escape in any, gives the keys back to the editor's shortcuts
  (`field-keys.js`). A window that draws itself again at a choice wraps that draw in
  `keepFocus` too. A button that switches itself off under the keys (Undo, at the last step)
  keeps them as a stand-in that says it is off (`standIn`, `aria-disabled`): style what is off
  with `:is(:disabled, [aria-disabled='true'])`. Where the control used is gone, the keys go to
  the one in its place, but never by that guess to a button that applies or deletes
  (`besides`): a window says where they go instead (`showAdded` in Swap colours). A name typed in place is kept at Tab
  (`renameInPlace`), and a window's opener that the bars draw again has an id, so the keys
  come back to it. A name typed in a list that is drawn again is kept through `afterPress`, as
  any field's change is: a part's name, drawn again at once, swallowed the next press.
- A button is named by what it is, in a word or two (`toolName`); what it does at length is
  its `title` and `aria-description`. A button whose name says what a press does (Hide, Show)
  is not also `aria-pressed`. A menu marks the button it hangs from (`marksOpen`).
- Whatever a drag does in a list has keys too: Alt and an arrow move a frame or a layer, and
  Home and End go to a list's ends (`onListKey` in `layers-panel.js`). A run of such moves of one
  layer, key after key, is one step to undo, as a run of nudges is (`moveByKey`,
  `joinStructure`).
- Every view playing is shown whole, whatever the room: between whole pixels, or under one,
  where whole pixels do not fit it (`playLayout`, `stepped`).
- With a phone's sheet up the canvas keeps to the room above the bar's: it gives up no margin
  for a step more of zoom there (`keepsBarRoom` in `fitZoom`).
- A frame deleted from one view goes from every view, its hidden mark with it, when no other
  view has anything drawn in it (`drawnOnlyIn`). Where another view keeps its frame, the mark
  stays on its place in every view, and the change says so (`saysWhatMoved`). The export says
  which frames are hidden from play and still in the files (`hiddenFrames`).
- A canvas is sized for the room it has, never shrunk by the stylesheet (`viewBox` in
  `src/ui/body/cut-view.js`): squashed, its art is out of shape and a press lands beside the
  finger.
- What a shortcut does has a control where there are no keys (`hasKeyboard`), at every layout: a
  tablet held wide has the desk's bar and a finger's hands (Paste in its More menu or its bar).

## The MCP server

`tools/mcp/` is a server of tools for Claude Code (`.mcp.json` names it): it reads and writes the
project file "Save project file" writes, with the studio's own plain logic (`src/model`, `src/clean`,
`src/export`), so what it makes opens in the studio. It needs nothing installed: the protocol
(`protocol.js`) and PNG (`png.js`) are written out, as the page's code cannot use the browser's
canvas there. A tool is `{ name, description, inputSchema, run }`; `run` returns what to say, and
throws a sentence when it cannot, which the caller is told as the tool's result. A new thing a
project can hold that Claude Code should reach gets a tool, and a test in `tools/mcp/test/`.

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
