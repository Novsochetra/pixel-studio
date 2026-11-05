from pathlib import Path
root = Path(__file__).resolve().parents[1]
page = (root / 'dist' / 'index.html').read_text()
head = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
(root / 'dist' / 'wrapped.html').write_text(head + page + '</body></html>')
