import sys, json, argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
sys.argv = ['x']
import numpy as np
from PIL import Image
import pixel_clean as pc

work = Path(__file__).resolve().parent / 'images'
out = Path(__file__).resolve().parents[1] / 'fixtures'
args = argparse.Namespace(cell=None, native=None, bg=None, colors=None, keep_bg=False, tol=60, hole_min=6, merge=30, height=None, scale=5)
for name in ('front.png', 'side.webp', 'back.webp', 'back2.webp'):
    rgba = np.array(Image.open(work / name).convert('RGBA'))
    (out / f'{name}.rgba').write_bytes(rgba.tobytes())
    json.dump({'width': rgba.shape[1], 'height': rgba.shape[0]}, open(out / f'{name}.json', 'w'))
ref = pc.analyze(work / 'front.png', args)
(out / 'front.expected.rgba').write_bytes(pc.to_rgba(ref['colors'], ref['opaque']).tobytes())
palette = np.unique(ref['colors'][ref['opaque']], axis=0)
meta = {}
for name in ('side.webp', 'back.webp', 'back2.webp'):
    s = pc.analyze(work / name, args, palette)
    meta[name] = {'cell': [float(v) for v in s['cell']]}
    s = pc.match_height(s, ref, None)
    colors, opaque = pc.place_like(s, ref)
    (out / f'{name}.expected.rgba').write_bytes(pc.to_rgba(colors, opaque).tobytes())
json.dump(meta, open(out / 'expected.json', 'w'), indent=1)
print(meta)
