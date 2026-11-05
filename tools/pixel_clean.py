#!/usr/bin/env python3
"""
pixel_clean.py: turn "fake" AI pixel art (soft, blended edges) into true hard-edged pixel art.

  1. Finds the background: every flat colour on the image border, so a baked-in checkerboard
     (two colours) works as well as a solid magenta.
  2. Finds the pixel grid. A clean image (every cell one flat colour) is read exactly; a blurry AI
     image is measured from its edges, ignoring background-to-background edges (a checkerboard
     would otherwise win and halve the resolution).
  3. Rebuilds the sprite at native size, one colour per cell, voted from the cell's centre.
  4. Removes the background by flood fill from the border, so an eye highlight the same colour as
     the background survives, and drops the fringe: a cell that is a blend of background and sprite
     goes to whichever side it is mostly made of.
  5. Snaps to a palette: its own, merged (--merge), --colors N, or a reference sprite's (--like).
  6. With --like REF: lays the sprite out exactly like REF (same canvas, same pixel size, feet on
     the same row, body on the same column, REF's colours), for views of one character.

Usage:
  python3 pixel_clean.py image.png                          # auto everything
  python3 pixel_clean.py side.webp --like front.png         # match another view of the character
  python3 pixel_clean.py side.webp --like front.png --height 98   # also force sprite height
  python3 pixel_clean.py side.webp --like front_160x160_native.png --scale 5  # native reference
  python3 pixel_clean.py image.png --colors 16 --trim --scale 5
  python3 pixel_clean.py image.png --cell 7.84              # force grid size (8.5x10.3: non-square)
  python3 pixel_clean.py image.png --trim --size 64x64 --anchor bottom --export 512x512

Needs: pip3 install pillow numpy
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image


# ---------- background ----------

def border_pixels(rgb: np.ndarray, depth: int = 4) -> np.ndarray:
    return np.concatenate([rgb[:depth].reshape(-1, 3), rgb[-depth:].reshape(-1, 3),
                           rgb[:, :depth].reshape(-1, 3), rgb[:, -depth:].reshape(-1, 3)])


def detect_bg(rgb: np.ndarray, share: float = 0.1) -> np.ndarray:
    """Every colour that covers at least `share` of the border (1 for magenta, 2 for a checker)."""
    px = border_pixels(rgb).astype(int)
    bins = px // 24
    keys = bins[:, 0] * 4096 + bins[:, 1] * 64 + bins[:, 2]
    vals, counts = np.unique(keys, return_counts=True)
    picked = vals[counts >= share * len(px)]
    return np.array([np.median(px[keys == v], axis=0) for v in picked])


def bg_distance(rgb: np.ndarray, bgs: np.ndarray) -> np.ndarray:
    diff = np.abs(rgb[..., None, :3].astype(int) - bgs[None, None].astype(int)).sum(-1)
    return diff.min(-1)


def flood_from_border(mask: np.ndarray) -> np.ndarray:
    """The part of `mask` connected (4-way) to the image border."""
    seen = np.zeros_like(mask)
    seen[0], seen[-1], seen[:, 0], seen[:, -1] = mask[0], mask[-1], mask[:, 0], mask[:, -1]
    while True:
        grown = seen.copy()
        grown[1:] |= seen[:-1]
        grown[:-1] |= seen[1:]
        grown[:, 1:] |= seen[:, :-1]
        grown[:, :-1] |= seen[:, 1:]
        grown &= mask
        if (grown == seen).all():
            return seen
        seen = grown


# ---------- grid ----------

def edge_profile(rgb: np.ndarray, axis: int, ignore=None) -> np.ndarray:
    d = np.abs(np.diff(rgb.astype(np.int32), axis=axis)).sum(axis=2).astype(np.float64)
    if ignore is not None:
        both = (ignore[1:] & ignore[:-1]) if axis == 0 else (ignore[:, 1:] & ignore[:, :-1])
        d[both] = 0
    prof = d.sum(axis=1 - axis)
    return prof / (prof.mean() + 1e-9)


def exact_cell(rgb: np.ndarray, max_cell: int = 64, purity: float = 0.995):
    """For already-clean art: the largest whole cell size where (nearly) every colour change falls
    on one grid line phase, plus that phase. None for blurry images."""
    profs = [edge_profile(rgb, 1), edge_profile(rgb, 0)]
    for s in range(max_cell, 1, -1):
        offsets = []
        for prof in profs:
            phase = np.bincount((np.arange(len(prof)) + 1) % s, weights=prof, minlength=s)
            if phase.max() < purity * phase.sum():
                break
            offsets.append(float(phase.argmax()))
        else:
            return s, offsets
    return None


def peaks(prof: np.ndarray) -> np.ndarray:
    # negative 2nd derivative: keeps sharp edges, drops slow trends like the silhouette
    k = np.array([1, 4, 6, 4, 1], float) / 16
    s = np.convolve(prof, k, mode="same")
    lap = np.zeros_like(s)
    lap[1:-1] = 2 * s[1:-1] - s[:-2] - s[2:]
    return np.clip(lap, 0, None)


def coherence(prof: np.ndarray, cands: np.ndarray) -> np.ndarray:
    p = peaks(prof)
    x = np.arange(len(p))
    z = np.exp(2j * np.pi * x[None, :] / cands[:, None]) @ p
    return np.abs(z) / (p.sum() + 1e-9)


def detect_cell(profs, lo=2.0, hi=40.0) -> float:
    cands = np.arange(lo, hi, 0.01)
    score = sum(coherence(p, cands) for p in profs)
    i = int(score.argmax())
    # s/2 and s/3 also line up; climb to the largest size that still does (a true 2s cancels out)
    moved = True
    while moved:
        moved = False
        for k in (2, 3):
            win = np.where(np.abs(cands - k * cands[i]) <= 0.02 * k * cands[i])[0]
            if len(win) and score[win].max() >= 0.6 * score[i]:
                i, moved = int(win[score[win].argmax()]), True
                break
    # a 0.01 px error drifts ~2 px across 160 cells, enough to sample the wrong pixel
    fine = np.arange(cands[i] - 0.03, cands[i] + 0.03, 0.0005)
    return float(fine[sum(coherence(p, fine) for p in profs).argmax()])


def find_offset(prof: np.ndarray, s: float) -> float:
    p = peaks(prof)
    ang = np.angle((np.exp(2j * np.pi * np.arange(len(p)) / s) * p).sum())
    # diff index k is the boundary between px k and k+1, so the cell starts half a px later
    return ((ang / (2 * np.pi)) * s + 0.5) % s


def parse_cell(text):
    sx, _, sy = str(text).lower().partition("x")
    return float(sx), float(sy or sx)


def grid_lines(prof, s: float, size: int):
    return snap_lines(cell_starts(find_offset(prof, s), s, size), prof, s)


def grid_error(rgb, is_bg, profs, sx, sy) -> float:
    """How far the image is from its rebuild on this grid: mean colour error per sprite pixel."""
    h, w = rgb.shape[:2]
    xs, ys = grid_lines(profs[0], sx, w), grid_lines(profs[1], sy, h)
    cols = list(zip(spans(xs, sx, w, 0, 1), spans(xs, sx, w, 0.25, 0.75)))
    total, count = 0.0, 0
    for (ya, yb), (iya, iyb) in zip(spans(ys, sy, h, 0, 1), spans(ys, sy, h, 0.25, 0.75)):
        for (xa, xb), (ixa, ixb) in cols:
            sprite = ~is_bg[ya:yb, xa:xb]
            if sprite.any():
                shade = np.median(rgb[iya:iyb, ixa:ixb].reshape(-1, 3), axis=0)
                total += np.abs(rgb[ya:yb, xa:xb].astype(int) - shade).sum(-1)[sprite].sum()
                count += sprite.sum()
    return total / max(count, 1)


def axis_candidates(prof, s: float):
    cands = np.arange(0.6 * s, 1.1 * s, 0.01)
    score = coherence(prof, cands)
    tops = [i for i in range(1, len(score) - 1)
            if score[i] >= score[i - 1] and score[i] >= score[i + 1] and score[i] > 0.5 * score.max()]
    return [float(cands[i]) for i in tops if abs(cands[i] - s) > 0.1 * s]


def axis_cells(rgb, is_bg, profs, s: float):
    """An AI image's pixels need not be square: ChatGPT's back views came out with 9-10 px rows
    and 7-8 px columns, and its columns wander, so their spacing alone can mislead. Each axis
    tries the sizes its edges suggest and keeps the one whose rebuild is closest to the image.
    A smaller cell always fits a little closer, so among near-ties (2%) the one whose edges line
    up best wins; and the shared size stays unless the winner is clearly (7%) better, since a
    small difference is jitter and resampling it away would double the outline."""
    sizes = [s, s]
    base = grid_error(rgb, is_bg, profs, s, s)
    for axis in (0, 1):
        tried = []
        for cand in axis_candidates(profs[axis], s):
            trial = [cand, s] if axis == 0 else [s, cand]
            tried.append((grid_error(rgb, is_bg, profs, *trial), cand))
        if not tried or min(tried)[0] >= 0.93 * base:
            continue

        near = [cand for err, cand in tried if err <= 1.02 * min(tried)[0]]
        lined_up = coherence(profs[axis], np.array(near))
        sizes[axis] = near[int(lined_up.argmax())]
    return sizes


def find_grid(rgb, bg_mask, a, cut_out=False):
    h, w = rgb.shape[:2]
    exact = None if (a.cell or a.native) else exact_cell(rgb)
    # a cut-out sprite with no bigger grid is already one pixel per art pixel (a native PNG)
    if cut_out and not exact and not (a.cell or a.native):
        exact = 1, (0.0, 0.0)
    if exact:
        s, (ox, oy) = exact
        return float(s), float(s), ox, oy, True, None

    profs = [edge_profile(rgb, 1, bg_mask), edge_profile(rgb, 0, bg_mask)]
    if a.native:
        sx = sy = w / a.native
    elif a.cell:
        sx, sy = parse_cell(a.cell)
    else:
        s = detect_cell(profs, hi=max(40.0, min(h, w) / 8))
        sx, sy = axis_cells(rgb, bg_mask, profs, s)

    return sx, sy, find_offset(profs[0], sx), find_offset(profs[1], sy), False, profs


# ---------- rebuild ----------

def cell_color(block: np.ndarray, is_bg: np.ndarray):
    """(colour, background?) by majority vote; near-identical shades vote together."""
    on_bg = is_bg.mean() > 0.5
    px = block.reshape(-1, 3)[is_bg.ravel() == on_bg].astype(int)
    keys = (px // 8) @ np.array([1024, 32, 1])
    vals, counts = np.unique(keys, return_counts=True)

    return np.median(px[keys == vals[counts.argmax()]], axis=0).astype(np.uint8), on_bg


def cell_starts(offset: float, s: float, size: int):
    start = (offset + s / 2) % s - s / 2
    return np.array([v for v in np.arange(start, size, s) if 0 <= v + s / 2 < size])


def snap_lines(starts: np.ndarray, prof: np.ndarray, s: float) -> np.ndarray:
    """Move each grid line onto the real edge next to it. An AI image upscaled by a fraction
    has cells of uneven width (8 and 9 px for 8.4), so an even grid drifts up to half a cell
    off and samples the neighbouring pixel: outlines double and the sprite grows a row."""
    p = peaks(prof)
    strong = 0.15 * np.percentile(p[p > 0], 95) if (p > 0).any() else np.inf
    shift = np.full(len(starts), np.nan)
    for k, v in enumerate(starts):
        lo, hi = max(int(np.ceil(v - 0.5 - 0.45 * s)), 0), min(int(v - 0.5 + 0.45 * s) + 1, len(p))
        if hi > lo and p[lo:hi].max() >= strong:
            shift[k] = lo + int(p[lo:hi].argmax()) + 0.5 - v
    known = ~np.isnan(shift)
    if not known.any():
        return starts
    # lines with no edge (flat colour) follow the drift of the lines around them
    shift = np.interp(np.arange(len(starts)), np.where(known)[0], shift[known])
    lines = starts + shift
    for k in range(1, len(lines)):
        lines[k] = max(lines[k], lines[k - 1] + 0.5 * s)
    return lines


def spans(lines: np.ndarray, s: float, size: int, lo: float, hi: float):
    ends = np.append(lines[1:], lines[-1] + s)
    for start, end in zip(lines, ends):
        a = max(int(round(start + (end - start) * lo)), 0)
        b = min(max(int(round(start + (end - start) * hi)), a + 1), size)
        yield a, b


def rebuild(rgb, is_bg, grid):
    sx, sy, ox, oy, exact, profs = grid
    h, w = rgb.shape[:2]
    xs, ys = cell_starts(ox, sx, w), cell_starts(oy, sy, h)
    if not exact:
        xs, ys = snap_lines(xs, profs[0], sx), snap_lines(ys, profs[1], sy)
    # sample the inner 50% of each cell, away from blended borders (the whole cell if clean)
    lo, hi = (0.0, 1.0) if exact else (0.25, 0.75)
    colors = np.zeros((len(ys), len(xs), 3), np.uint8)
    bg = np.zeros((len(ys), len(xs)), bool)
    for r, (ya, yb) in enumerate(spans(ys, sy, h, lo, hi)):
        for c, (xa, xb) in enumerate(spans(xs, sx, w, lo, hi)):
            colors[r, c], bg[r, c] = cell_color(rgb[ya:yb, xa:xb], is_bg[ya:yb, xa:xb])
    return colors, bg


# ---------- transparency ----------

def components(mask: np.ndarray):
    """4-way connected regions of `mask`, as boolean masks."""
    left = mask.copy()
    while left.any():
        seed = np.zeros_like(mask)
        y, x = np.argwhere(left)[0]
        seed[y, x] = True
        while True:
            grown = seed.copy()
            grown[1:] |= seed[:-1]
            grown[:-1] |= seed[1:]
            grown[:, 1:] |= seed[:, :-1]
            grown[:, :-1] |= seed[:, 1:]
            grown &= mask
            if (grown == seed).all():
                break
            seed = grown
        left &= ~seed
        yield seed


def transparent_cells(bg: np.ndarray, colors: np.ndarray, hole_min: int, tol: int) -> np.ndarray:
    """Background reached from the border, plus enclosed background: a region of at least
    `hole_min` cells (a gap under an arm), or a small one whose colour the sprite never uses
    (a magenta gap by a hand). A small one in a sprite colour is detail, like an eye
    highlight as white as a checker square."""
    clear = flood_from_border(bg)
    sprite = np.unique(colors[~bg].reshape(-1, 3), axis=0).astype(int)
    for hole in components(bg & ~clear):
        shade = np.median(colors[hole], axis=0)
        unused = not len(sprite) or np.abs(sprite - shade).sum(1).min() > 2 * tol
        if hole.sum() >= hole_min or unused:
            clear |= hole
    return clear


def edge_cells(opaque: np.ndarray) -> np.ndarray:
    pad = np.pad(~opaque, 1, constant_values=True)
    near = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    return opaque & near


def despeckle(opaque: np.ndarray) -> np.ndarray:
    pad = np.pad(opaque, 1)
    neighbours = pad[:-2, 1:-1].astype(int) + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]
    return opaque & (neighbours > 0)


def lone_edge_colours(colors: np.ndarray, opaque: np.ndarray) -> np.ndarray:
    """An outline pixel whose colour none of its 8 neighbours share is a blend of background
    and outline that snapped to the wrong palette colour; it takes its neighbours' colour.
    Inside the sprite a lone pixel is detail (a highlight), so only the edge is touched."""
    out = colors.copy()
    h, w = opaque.shape
    for y, x in np.argwhere(edge_cells(opaque)):
        near = [tuple(colors[j, i]) for j in range(max(y - 1, 0), min(y + 2, h))
                for i in range(max(x - 1, 0), min(x + 2, w)) if (j, i) != (y, x) and opaque[j, i]]
        if near and tuple(colors[y, x]) not in near:
            out[y, x] = max(near, key=near.count)
    return out


# ---------- palette ----------

def merge_similar(colors: np.ndarray, opaque: np.ndarray, tol: int) -> np.ndarray:
    """Collapse near-identical shades (AI noise) into the most common of them."""
    px = colors[opaque].astype(int)
    cols, inv, counts = np.unique(px, axis=0, return_inverse=True, return_counts=True)
    target = np.arange(len(cols))
    keepers = []
    for i in np.argsort(-counts, kind="stable"):
        near = [k for k in keepers if np.abs(cols[i] - cols[k]).sum() <= tol]
        target[i] = near[0] if near else i
        if not near:
            keepers.append(i)
    out = colors.copy()
    out[opaque] = cols[target[inv.ravel()]]
    return out


def quantize(colors: np.ndarray, opaque: np.ndarray, n: int) -> np.ndarray:
    strip = Image.fromarray(colors[opaque][None].astype(np.uint8), "RGB")
    q = strip.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out = colors.copy()
    out[opaque] = np.array(q.convert("RGB"))[0]
    return out


def own_palette(colors: np.ndarray, opaque: np.ndarray, min_count: int = 3) -> np.ndarray:
    """Colours that fill the inside of the sprite: a blend left by the background only shows on
    the outline, so it is not one of them."""
    inner = opaque & ~edge_cells(opaque)
    cols, counts = np.unique(colors[inner].reshape(-1, 3), axis=0, return_counts=True)
    return cols[counts >= min_count] if (counts >= min_count).any() else cols


def unmix(color, palette, bgs):
    """Explain an outline colour as palette colour p over background b with coverage a.
    Returns (palette index, a)."""
    c, p, b = color.astype(float), palette.astype(float), bgs.astype(float)
    pure = np.abs(p - c).sum(1)
    best = (int(pure.argmin()), 1.0, pure.min())
    for bg in b:
        span = p - bg
        a = np.clip(((c - bg) * span).sum(1) / ((span ** 2).sum(1) + 1e-9), 0, 1)
        resid = np.abs(bg + a[:, None] * span - c).sum(1)
        j = int(resid.argmin())
        # prefer the plain colour unless the blend explains the pixel clearly better
        if resid[j] < 0.6 * best[2]:
            best = (j, float(a[j]), resid[j])
    return best[0], best[1]


def snap(colors, opaque, palette, bgs):
    """Every opaque cell to its nearest palette colour; an outline cell that is mostly background
    becomes transparent (the fringe a soft edge leaves)."""
    out, opaque = colors.copy(), opaque.copy()
    edge = edge_cells(opaque)
    pal = palette.astype(int)
    for y, x in np.argwhere(opaque):
        c = colors[y, x].astype(int)
        if edge[y, x] and len(bgs):
            j, a = unmix(c, pal, bgs)
            opaque[y, x] = a >= 0.5
        else:
            j = int(np.abs(pal - c).sum(1).argmin())
        out[y, x] = pal[j]
    return out, opaque


# ---------- one image ----------

def parse_colors(text):
    return np.array([[int(h.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)] for h in text.split(",")])


def load_flat(path: Path):
    """The image as RGB, and whether it was already cut out. A cut-out PNG hides any colour
    (often black, which would match the outline) under its transparent pixels, so they are
    painted one flat key colour that the background detection then finds on the border."""
    rgba = np.array(Image.open(path).convert("RGBA"))
    rgb, clear = rgba[..., :3].copy(), rgba[..., 3] < 128
    rgb[clear] = (255, 0, 255)
    return rgb, bool(clear.any())


def analyze(path: Path, a, palette=None):
    rgb, cut_out = load_flat(path)
    bgs = np.zeros((0, 3)) if a.keep_bg else (parse_colors(a.bg) if a.bg else detect_bg(rgb))
    is_bg = bg_distance(rgb, bgs) <= a.tol if len(bgs) else np.zeros(rgb.shape[:2], bool)
    grid = find_grid(rgb, is_bg, a, cut_out)
    exact = grid[4]
    colors, bg_cells = rebuild(rgb, is_bg, grid)
    opaque = ~transparent_cells(bg_cells, colors, a.hole_min, a.tol) if len(bgs) else np.ones_like(bg_cells)

    if a.merge > 0 and not exact:
        colors = merge_similar(colors, opaque, a.merge)

    if a.colors:
        colors = quantize(colors, opaque, a.colors)

    if palette is not None or not exact:
        own = own_palette(colors, opaque)
        colors, opaque = snap(colors, opaque, own if palette is None else palette, bgs)
        colors = lone_edge_colours(colors, opaque)

    return {"colors": colors, "bg_colors": colors.copy(), "opaque": despeckle(opaque),
            "cell": grid[:2], "exact": exact, "bgs": bgs}


def to_rgba(colors, opaque):
    return np.dstack([np.where(opaque[..., None], colors, 0), np.where(opaque, 255, 0)]).astype(np.uint8)


def bbox(opaque):
    ys, xs = np.where(opaque)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def body_column(opaque) -> float:
    """Mean column of the legs (lowest quarter): the body's axis, which hair or an arm
    sticking out to one side does not move."""
    _, top, _, bottom = bbox(opaque)
    legs = opaque[bottom - max(1, (bottom - top) // 4):bottom]
    return float(np.where(legs)[1].mean())


# ---------- --like: lay out like a reference view ----------

def checker_period(bg_colors, clear, bgs):
    if len(bgs) != 2:
        return None
    first = (np.abs(bg_colors.astype(int) - bgs[0]).sum(-1) < np.abs(bg_colors.astype(int) - bgs[1]).sum(-1))
    ys, xs = np.where(clear)
    for p in range(1, 33):
        parity = ((ys // p + xs // p) % 2) == 0
        if (parity == first[ys, xs]).all() or (parity != first[ys, xs]).all():
            flip = (parity != first[ys, xs]).all()
            return p, flip
    return None


def reference_background(ref):
    h, w = ref["opaque"].shape
    bgs = ref["bgs"]
    found = checker_period(ref["bg_colors"], ~ref["opaque"], bgs)
    if not found:
        fill = bgs[0] if len(bgs) else np.zeros(3)
        return np.broadcast_to(fill, (h, w, 3)).astype(np.uint8)

    p, flip = found
    yy, xx = np.mgrid[0:h, 0:w]
    first = (((yy // p + xx // p) % 2) == 0) ^ flip
    return np.where(first[..., None], bgs[0], bgs[1]).astype(np.uint8)


def place_like(sprite, ref):
    """Sprite on the reference canvas: feet on the reference's bottom row, legs on its column."""
    h, w = ref["opaque"].shape
    left, top, right, bottom = bbox(sprite["opaque"])
    _, _, _, ref_bottom = bbox(ref["opaque"])
    dx = int(round(body_column(ref["opaque"]) - body_column(sprite["opaque"])))
    dy = ref_bottom - bottom
    colors, opaque = np.zeros((h, w, 3), np.uint8), np.zeros((h, w), bool)
    for y, x in np.argwhere(sprite["opaque"]):
        ty, tx = y + dy, x + dx
        if 0 <= ty < h and 0 <= tx < w:
            colors[ty, tx], opaque[ty, tx] = sprite["colors"][y, x], True
    return colors, opaque


def scale_axis(rgba: np.ndarray, factor: float, axis: int) -> np.ndarray:
    """Nearest-neighbour stretch along one axis that keeps 1-pixel lines 1 pixel: where a
    source pixel is drawn twice and it is a line (unlike both neighbours), the second copy
    takes the next pixel's colour instead, so outlines and trims don't double."""
    src = np.moveaxis(rgba, axis, 0)
    n = src.shape[0]
    pick = np.minimum(((np.arange(int(round(n * factor))) + 0.5) / factor).astype(int), n - 1)
    out = src[pick].copy()
    padded = np.concatenate([src[:1] * 0, src, src[:1] * 0])
    unlike = lambda a, b: (a != b).any(-1)
    thin = unlike(padded[1:-1], padded[:-2]) & unlike(padded[1:-1], padded[2:])
    for i in np.where(np.diff(pick, prepend=-1) == 0)[0]:
        k = pick[i]
        if k + 1 < n:
            out[i] = np.where(thin[k][..., None], src[k + 1], src[k])
    return np.moveaxis(out, 0, axis)


def match_height(sprite, ref, height):
    """Scale the sprite to the reference's height (or `height`) when it was drawn with
    different-sized pixels, and make its pixels square. Within 5% it is left alone:
    resampling costs crispness, and a view can be a row taller than another (side-on hair)."""
    _, top, _, bottom = bbox(sprite["opaque"])
    _, ref_top, _, ref_bottom = bbox(ref["opaque"])
    target = height or (ref_bottom - ref_top)
    fy = target / (bottom - top)
    if not height and abs(fy - 1) <= 0.05:
        fy = 1.0
    sx, sy = sprite["cell"]
    fx = fy * sx / sy
    if abs(fx - 1) <= 0.01 and fy == 1.0:
        return sprite

    rgba = to_rgba(sprite["colors"], sprite["opaque"])[top:bottom]
    rgba = scale_axis(scale_axis(rgba, fy, 0), fx, 1)
    print(f"   scaled {fx:.3f}x wide, {fy:.3f}x tall: drawn {bottom - top} art px tall, the reference is {ref_bottom - ref_top}")
    return {**sprite, "colors": rgba[..., :3], "opaque": rgba[..., 3] > 0}


def like(path, a):
    ref_args = argparse.Namespace(**{**vars(a), "cell": None, "native": None, "bg": None,
                                     "colors": None, "keep_bg": False})
    ref = analyze(a.like, ref_args)
    palette = np.unique(ref["colors"][ref["opaque"]], axis=0)
    sprite = analyze(path, a, palette)
    sprite = match_height(sprite, ref, a.height)

    colors, opaque = place_like(sprite, ref)
    # a native (1 px per art pixel) reference has no screen size of its own: use --scale
    scale = int(round(ref["cell"][1])) if ref["cell"][1] > 1 else a.scale
    preview = np.where(opaque[..., None], colors, reference_background(ref))
    ref_view = np.where(ref["opaque"][..., None], ref["colors"], reference_background(ref))
    stem = path.with_suffix("")
    save(Image.fromarray(preview), scale, f"{stem}_preview.png")
    gap = np.full((ref_view.shape[0], 4, 3), 40, np.uint8)
    save(Image.fromarray(np.hstack([ref_view, gap, preview])), scale, f"{stem}_compare.png")
    report_like(ref, sprite, opaque)

    return Image.fromarray(to_rgba(colors, opaque), "RGBA"), scale


def cell_text(cell):
    sx, sy = cell
    return f"{sx:.3f}px" if abs(sx - sy) < 1e-6 else f"{sx:.3f}x{sy:.3f}px"


def report_like(ref, sprite, opaque):
    r, s = bbox(ref["opaque"]), bbox(opaque)
    print(f"   reference: cell {cell_text(ref['cell'])}, sprite {r[2] - r[0]}x{r[3] - r[1]}, feet on row {r[3] - 1}")
    print(f"   this view: cell {cell_text(sprite['cell'])}, sprite {s[2] - s[0]}x{s[3] - s[1]}, feet on row {s[3] - 1}")


# ---------- crop / fit / export ----------

def parse_size(s: str):
    w, h = s.lower().split("x")
    return int(w), int(h)


def trim(img: Image.Image, pad: int) -> Image.Image:
    box = img.getchannel("A").getbbox()
    if not box:
        return img
    left, top, right, bottom = box
    return img.crop((max(left - pad, 0), max(top - pad, 0),
                     min(right + pad, img.width), min(bottom + pad, img.height)))


def fit_canvas(img: Image.Image, size, anchor: str) -> Image.Image:
    cw, ch = size
    if img.width > cw or img.height > ch:
        f = min(cw / img.width, ch / img.height)
        nw, nh = min(cw, max(1, round(img.width * f))), min(ch, max(1, round(img.height * f)))
        print(f"   note: sprite {img.width}x{img.height} shrunk to {nw}x{nh} to fit {cw}x{ch} (detail lost)")
        img = img.resize((nw, nh), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    y = {"bottom": ch - img.height, "top": 0}.get(anchor, (ch - img.height) // 2)
    canvas.alpha_composite(img, ((cw - img.width) // 2, y))
    return canvas


def save(img: Image.Image, scale: int, name: str, export_size=None) -> Path:
    if export_size:
        ew, eh = export_size
        if ew % img.width or eh % img.height or ew // img.width != eh // img.height:
            print(f"   warning: {ew}x{eh} is not a whole multiple of {img.width}x{img.height}; uneven pixels")
        big = img.resize((ew, eh), Image.Resampling.NEAREST)
    else:
        big = img.resize((img.width * scale, img.height * scale), Image.Resampling.NEAREST)
    big.save(name)
    return Path(name)


def plain(path, a):
    r = analyze(path, a)
    out = Image.fromarray(to_rgba(r["colors"], r["opaque"]), "RGBA")
    grid = "exact" if r["exact"] else "estimated"
    print(f"   cell {cell_text(r['cell'])} ({grid}) -> native {out.width}x{out.height}, background {r['bgs'].astype(int).tolist()}")
    if a.crop:
        x, y, cw, ch = (int(v) for v in a.crop.split(","))
        out = out.crop((x, y, x + cw, y + ch))
    if a.trim:
        out = trim(out, a.pad)
    if a.size:
        out = fit_canvas(out, parse_size(a.size), a.anchor)
    return out, a.scale


def process(path: Path, a):
    print(f"{path.name}:")
    out, scale = like(path, a) if a.like else plain(path, a)
    stem = path.with_suffix("")
    out.save(f"{stem}_native.png")
    big = save(out, scale, f"{stem}_upscaled.png", parse_size(a.export) if a.export else None)
    o = np.array(out)
    ncol = len(np.unique(o[o[:, :, 3] == 255][:, :3], axis=0))
    print(f"   final {out.width}x{out.height}, {ncol} colours -> {stem}_native.png, {big}")


def main():
    p = argparse.ArgumentParser(description="Remove anti-aliasing from AI pixel art.")
    p.add_argument("images", nargs="+", type=Path)
    p.add_argument("--cell", help="force grid size in image px: 7.84, or 8.5x10.3 for non-square pixels")
    p.add_argument("--native", type=int, help="force native width in art pixels (e.g. 160)")
    p.add_argument("--colors", type=int, help="snap to N colours (e.g. 16)")
    p.add_argument("--merge", type=int, default=30,
                   help="merge shades closer than this (R+G+B difference, default 30, 0 = off)")
    p.add_argument("--scale", type=int, default=8, help="nearest-neighbour upscale factor (default 8)")
    p.add_argument("--bg", help="background colour(s) to remove, e.g. ff00ff or 00ff00,ffffff; default: from the border")
    p.add_argument("--tol", type=int, default=60, help="background match tolerance (default 60)")
    p.add_argument("--hole-min", type=int, default=6,
                   help="enclosed background regions this many cells or larger turn transparent too (default 6)")
    p.add_argument("--keep-bg", action="store_true", help="don't make the background transparent")
    g = p.add_argument_group("match another view")
    g.add_argument("--like", type=Path, help="reference sprite: copy its canvas, pixel size, feet row, body column and colours")
    g.add_argument("--height", type=int, help="with --like: scale the sprite to this many art pixels tall (default: the reference's height, when it differs by over 5%%)")
    g = p.add_argument_group("crop / resize (sizes in art pixels unless noted)")
    g.add_argument("--trim", action="store_true", help="crop to the visible sprite")
    g.add_argument("--pad", type=int, default=0, help="empty pixels to keep around the sprite with --trim")
    g.add_argument("--crop", help="manual crop box x,y,w,h, applied before --trim")
    g.add_argument("--size", help="place the sprite on an exact canvas, e.g. 32x32 (shrinks only if needed)")
    g.add_argument("--anchor", choices=["bottom", "center", "top"], default="bottom")
    g.add_argument("--export", help="exact upscaled size in screen px, e.g. 512x512 (overrides --scale)")
    a = p.parse_args()
    failed = 0
    for path in a.images:
        try:
            process(path, a)
        except Exception as e:
            failed += 1
            print(f"{path}: failed: {e}", file=sys.stderr)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
