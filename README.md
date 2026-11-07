# Pixel Clean Studio

Turns AI-made "fake" pixel art into true pixel art, then lets you edit, animate and export it for
any game. Everything runs in the browser; the build makes one self-contained HTML page.

- **Start**: pick what you are making (a character, an object, tiles, an effect, an icon) or a game
  preset such as Naga Eleven; save any project as a preset of your own.
- **Clean**: finds the image's pixel grid, removes the background and fringe, and fits it as its
  kind stands: a character matched to its reference view, a tile filling its canvas, an effect
  centred. Later animation frames keep their own pixel size.
- **Edit**: pencil and eraser from 1 to 8 px, round or square; fill, colour swap, selection (a box, a lasso, or a colour),
  turned to any angle by its handle; a click on the art picks its layer; outlines, guides, layers,
  pictures to trace.
- **Animate**: each animation is a grid, views down and frames across, as the sheet will be: drag
  frames to reorder them, play them on the canvas (every view side by side with All views), hide a
  frame from play without deleting it, see the mirrored side, fold the frames away for room.
- **Body parts**: cut a character's view into parts (head, torso, arms, legs, feet; a first guess
  to correct with a brush or a freehand lasso), then pose them in each frame: drag a part to move it, its handle to
  turn it (RotSprite keeps turned pixel art clean), the parts that follow it coming along. Draw what
  a turn left missing on the part, and it stays there in every frame. Frames stay plain pixels for every download; turn one into pixels to touch it up by hand.
- **Preview**: characters in a scene (the pitch for Naga Eleven), tiles laid as a floor, effects and
  icons at 1×, 2× and 4×.
- **Cast**: Projects (the name, top left) shows every project as a card with its picture, its
  folders (one per game, or heroes, enemies, tiles) down the side. Drag a card onto a folder or use
  its ⋯ menu to move it; search finds any project or folder by name; sort by latest or A–Z. A new
  project goes in the folder that is open. "New character like this" sets up the next character
  of a game as the open one is: the same canvas, views, animations, frames, layers and guide lines,
  with nothing drawn, in the same folder. "Line up" stands every project shown side by side at one
  pixel size, to check heights agree, and downloads it as a PNG.
- **Export**: sprite sheet + Aseprite-style JSON (Phaser, Godot, Unity), separate frames, GIFs, and
  the Naga Eleven game pack.

## Run it

Needs Python 3 (for the build) and Node 20+ (for the checks).

```bash
npm run serve
```

Then open http://localhost:8811/wrapped.html. Outside claude.ai the page saves to the browser.

## Install it as an app

It is published at https://novsochetra.github.io/pixel-studio/ by
`.github/workflows/pages.yml` on each push to `main`; run `npm run check` before pushing, as the
workflow only builds. To host it elsewhere, serve all of `dist/` on any HTTPS address.

The browser then offers to install the studio (Chrome and Edge also show an **Install** button in
the toolbar; on an iPhone use Share, then Add to Home Screen). It opens in its own window and works with no network; a new build arrives by itself the
next time it opens online. Saved work stays in the browser, as before. The icons are in
`assets/icons/`, the manifest is `src/ui/manifest.webmanifest`, the worker
`src/worker/service-worker.js`. On claude.ai the page stays a plain page.

## Check it

```bash
npm install
```

```bash
npm run check
```

That runs ESLint and Prettier, the unit and regression tests, the build, and every browser flow
(`test/integration/`), which save screenshots in `shots/`. `npm test` runs only the fast tests.

## Layout

- `src/clean/`: the cleaner, a pixel-exact port of `tools/pixel_clean.py`, run in a worker
- `src/model/`: projects, kinds, presets, animations, frames, layers, sprites
- `src/editor/`, `src/palette/`, `src/export/`, `src/io/`, `src/store/`: tools, colours, exports,
  file formats, saving
- `src/ui/`: the page, one folder per feature (`grid/`, `start/`, `preview/`, `import/`, …);
  `src/ui/page.html` is its shell and `src/ui/styles/` its stylesheets, tokens first
- `src/art/`: colours painted as pixel art
- `build/build.py`: joins the modules into one page and refuses import cycles, missing exports and
  calls to functions that were never imported
- `test/unit/`, `test/integration/`, `test/regression/`: see `CLAUDE.md`
- `tools/claude-hooks/`: shows Claude Code each comment an edit adds (`.claude/settings.json`)
- `docs/`: plans and design notes

## The command-line cleaner

`tools/pixel_clean.py` does the same cleaning from a terminal (`pip install -r tools/requirements.txt`):

```bash
python3 tools/pixel_clean.py side.webp --like front.png
```
