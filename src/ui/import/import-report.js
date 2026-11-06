function cellText([sx, sy]) {
  return Math.abs(sx - sy) < 1e-6
    ? `${sx.toFixed(2)} px`
    : `${sx.toFixed(2)} × ${sy.toFixed(2)} px (not square)`;
}

function aloneLine(report, place) {
  const { scaled } = report;

  if (place === 'fill') {
    return `Scaled to fill the tile: ${scaled?.fx.toFixed(3) ?? 1}× wide, ${scaled?.fy.toFixed(3) ?? 1}× tall`;
  }

  return scaled
    ? `Kept its own colours, scaled ${scaled.fy.toFixed(3)}× to fit the canvas`
    : 'Kept its own colours and pixel size';
}

function matchLine(report, refHeight, refName) {
  const { scaled } = report;

  if (report.tooBig) {
    return `Too tall to keep its own pixel size on this canvas: scaled to match the ${refName}'s ${refHeight}`;
  }

  if (report.kept && (!scaled || scaled.fy === 1)) {
    return `Kept its own pixel size (${report.size[1]} px tall), with the ${refName}'s colours`;
  }

  if (!scaled) {
    return `Drawn at the ${refName}'s scale: not resized`;
  }

  if (scaled.fy === 1) {
    return `Kept its own pixel size (${scaled.drawnHeight} px tall), with the ${refName}'s colours`;
  }

  return `Drawn ${scaled.drawnHeight} px tall; scaled ${scaled.fx.toFixed(3)}× wide, ${scaled.fy.toFixed(3)}× tall to match the ${refName}'s ${refHeight}`;
}

// what the cleaner did, in a few lines: the grid it found, how it sized the art, where it stands
export function reportText(report, { place, refHeight, refName }) {
  const size = `${report.size[0]} × ${report.size[1]} px`;
  const where = place === 'feet' ? `, feet on row ${report.feetRow}` : '';

  return [
    `Grid: one art pixel = ${cellText(report.cell)} of the image`,
    report.alone ? aloneLine(report, place) : matchLine(report, refHeight, refName),
    `Result: ${size}${where}`,
  ].join('\n');
}

export function artHeight(sprite) {
  let top = null;
  let bottom = null;

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (sprite.pixels[(y * sprite.width + x) * 4 + 3]) {
        top ??= y;
        bottom = y;
      }
    }
  }

  return top === null ? 0 : bottom - top + 1;
}
