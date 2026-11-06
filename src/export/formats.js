import { createSprite } from '../model/sprite.js';

// one frame cut from a built sheet
export function sheetCell(result, settings, row, frame) {
  const { frameWidth, frameHeight } = settings;
  const cell = createSprite(frameWidth, frameHeight);

  for (let y = 0; y < frameHeight; y++) {
    const from = ((row * frameHeight + y) * result.sheet.width + frame * frameWidth) * 4;
    cell.pixels.set(result.sheet.pixels.subarray(from, from + frameWidth * 4), y * frameWidth * 4);
  }

  return cell;
}

// The sheet described the way Aseprite exports it ("hash" JSON), which Phaser, Godot and Unity
// importers read: every frame's rectangle and duration, one tag per direction, and the feet
// (anchor) as the pivot.
export function asepriteJson(result, settings, animation, imageName) {
  const { frameWidth: cellWidth, frameHeight: cellHeight } = settings;
  const duration = Math.round(1000 / animation.fps);
  const frames = {};
  const frameTags = [];

  result.rows.forEach((row, rowIndex) => {
    const from = rowIndex * result.frames;

    for (let frameIndex = 0; frameIndex < result.frames; frameIndex++) {
      frames[`${result.name} ${row.direction} ${frameIndex}`] = {
        frame: { x: frameIndex * cellWidth, y: rowIndex * cellHeight, w: cellWidth, h: cellHeight },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: cellWidth, h: cellHeight },
        sourceSize: { w: cellWidth, h: cellHeight },
        duration,
      };
    }

    frameTags.push({
      name: `${result.name} ${row.direction}`,
      from,
      to: from + result.frames - 1,
      direction: 'forward',
    });
  });

  return {
    frames,
    meta: {
      app: 'Pixel Clean Studio',
      image: imageName,
      format: 'RGBA8888',
      size: { w: result.sheet.width, h: result.sheet.height },
      scale: '1',
      frameTags,
      pivot: { x: settings.anchorX, y: settings.anchorY },
    },
  };
}

// every frame on its own: [{ path, sprite }], as animation/direction/frame.png
export function frameFiles(result, settings) {
  return result.rows.flatMap((row, rowIndex) =>
    Array.from({ length: result.frames }, (_, frameIndex) => ({
      path: `${result.name}/${row.direction}/${String(frameIndex + 1).padStart(2, '0')}.png`,
      sprite: sheetCell(result, settings, rowIndex, frameIndex),
    })),
  );
}

// each direction's frames, in order, for an animated preview
export function directionFrames(result, settings) {
  return result.rows.map((row, rowIndex) => ({
    direction: row.direction,
    frames: Array.from({ length: result.frames }, (_, family) =>
      sheetCell(result, settings, rowIndex, family),
    ),
  }));
}
