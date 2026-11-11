# Version 6 plan (agreed direction, still being discussed)

## 1. Not only for Naga Eleven

What still locks the studio to one game and one kind of art, and what to do about it:

1. **Start with "What are you making?"**: Character (multi-view, animated), Object or item (one view,
   centre or bottom anchor), Tiles (tile grid), Effect (animated, centre anchor),
   Icon or portrait. Each kind brings its own guides, anchor and export.
2. **Animation cleaning matches pixel size, not height**: today every frame is scaled to the
   standing pose's height, so a crouch or a slide is stretched.
3. **Game presets are data, not code**: canvas, directions, palette, parts and export settings.
   Naga Eleven (team kits, 64×62 frames, game pack) becomes one preset;
   anyone can save their own.
4. **A neutral start screen**: recent projects and New; the Sochetra sample moves behind "Try an
   example".
5. **"AI image" in general wording**; the ChatGPT prompt helper stays as one option.

## 2. Animations and frames as one grid

Today, what you draw is picked in four places (animation dropdown, Views list, frame strip, Layers
list), "New animation…" acts the moment a name is chosen and silently copies frame 1, the first
animation is called "Pose", and the mirrored side is never shown.

The animation becomes the grid it is exported as: views down, frames across.

```
 [ Idle ] [ Run ] [ Kick ] [ + New animation ]          8 fps  ▶ Play
 ┌──────────┬───────┬───────┬───────┬───────┬─────┐
 │ Front  ★ │  1    │  2    │  3    │  4    │  +  │
 │ Side     │  1    │  2    │ empty │ empty │     │
 │ Back     │  1    │  2    │  3    │  4    │     │
 │ Left side│  mirrored from Side (shown faded)  │
 └──────────┴───────┴───────┴───────┴───────┴─────┘
```

- Tabs are the animations (double-click renames; ⋯ holds Duplicate, Delete, fps).
- A cell is one picture: click to edit it. ★ marks the reference view.
- An empty cell offers: upload an image into it, start from the frame to its left, or draw.
- Columns are frames: drag a column to reorder; `+` adds a frame to every view.
- The mirrored side shows as a faded row.
- Layers stay on the right, as "the cell you are editing is made of these layers". The Views panel
  goes: its rows are the grid.
- New animation is a small form: name (Idle, Run, Kick, Jump…), frames, fps, start from (empty, the
  standing pose, another animation).
- The first animation is "Idle"; a standing pose is Idle with one frame.
- An object, effect or icon is the same grid with one row.

Open questions: grid under the canvas or as its own screen; mirrored row shown or hidden; play all
views side by side or only the current row.

## 3. A tidy bottom panel

Today (`v5-bottom-panel.png`): eleven buttons of equal weight wrap onto two rows, a sentence of help
sits on top, the frames are squeezed to the bottom, and a preview box stands empty beside them.

Proposed (`v6-bottom-panel.png`):

- **One slim top bar.** Left: the animation tabs (`Idle  Run  Kick  +`). Right: This view / All views,
  then onion skin and pins as icon toggles, then `8 fps` and a single ▶ Play.
- **The frames are the panel.** Big thumbnails, the number under each, a dashed `+` tile at the end
  to add a frame, and empty frames drawn as dashed outlines.
- **Frame actions live on the frame.** The selected frame shows a small ⋯ that opens: Image into
  this frame…, Start from frame N, Duplicate, Copy to other views, and Delete frame (in red, last).
  Reordering is dragging; the ← → buttons go (Alt+← / Alt+→ on the keyboard instead).
- **No help sentence and no empty preview box.** Play animates the canvas itself; tooltips explain
  the icons.
- **Collapsed** shows only the view being drawn (one row, about 120 px tall); **expanded** shows
  every view as the sheet will be, the mirrored side faded.
- On a phone: tap the selected frame again for its ⋯ menu; press and hold to drag.
