#!/usr/bin/env python3
"""Bundles src/ into one self-contained page, dist/index.html.

The artifact host allows scripts only inline or from a few CDNs, so every ES module is wrapped
in its own function scope and joined in dependency order; imports become reads from the module
objects. The cleaner's worker is bundled the same way and inlined as a string.

Beside the page go the files that make it an installable app: its manifest, icons and service
worker. The artifact host ignores them; any other host serves all of dist/.
"""
import base64
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
IMPORT = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)';", re.S)
EXPORT = re.compile(r"^export\s+(?:async\s+)?(?:function\s*\*?|const|let|class)\s*(\w+)", re.M)


def module_name(path: Path) -> str:
    return "__m_" + re.sub(r"\W", "_", str(path.relative_to(SRC).with_suffix("")))


def wrap(path: Path, order: list, seen: set, stack: tuple = ()):
    if path in stack:
        chain = " -> ".join(p.name for p in stack + (path,))
        raise SystemExit(f"import cycle: {chain}")
    if path in seen:
        return
    seen.add(path)
    text = path.read_text()
    for _, target in IMPORT.findall(text):
        wrap((path.parent / target).resolve(), order, seen, stack + (path,))
    order.append(path)


EXPORT_LIST = re.compile(r"^export\s*\{([^}]*)\};?\s*$", re.M)


def exports_of(path: Path) -> set:
    text = path.read_text()
    names = set(EXPORT.findall(text))
    for group in EXPORT_LIST.findall(text):
        names |= {n.strip() for n in group.split(",") if n.strip()}
    return names


def check_imports(path: Path):
    """every name a module imports must be exported by the module it names"""
    for names, target in IMPORT.findall(path.read_text()):
        source = (path.parent / target).resolve()
        missing = {n.strip().split(" as ")[0] for n in names.split(",") if n.strip()} - exports_of(source)
        if missing:
            raise SystemExit(f"{path.relative_to(SRC)} imports {sorted(missing)} that {source.relative_to(SRC)} does not export")


def declared_names(text: str) -> set:
    """names a module declares itself: functions, variables, destructured names, parameters"""
    names = set(re.findall(r"\b(?:function\s*\*?|class|const|let|var)\s+(\w+)", text))
    for group in re.findall(r"\b(?:const|let|var)\s*[{\[]([^}\]]*)[}\]]", text):
        names |= {part.split(":")[-1].split("=")[0].strip(" .") for part in group.split(",")}
    for group in re.findall(r"\(([^()]*)\)\s*(?:=>|\{)", text):
        names |= set(re.findall(r"(\w+)\s*(?:=[^,]*)?(?:,|$)", re.sub(r"[{}\[\]]", ",", group)))
    names |= set(re.findall(r"(\w+)\s*=>", text))
    # methods of classes and object literals: `undo(project) {`
    names |= set(re.findall(r"^\s*(?:async\s+)?(\w+)\s*\([^()]*\)\s*\{", text, flags=re.M))
    return names


def check_calls(path: Path, exported_anywhere: dict):
    """a function another module exports, called here without being imported, would only fail
    when that line runs"""
    text = path.read_text()
    code = re.sub(r"//.*", "", text)
    code = re.sub(r"'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|\"(?:[^\"\\\n]|\\.)*\"", "''", code)
    imported = set()
    for names, _ in IMPORT.findall(text):
        imported |= {n.strip().split(" as ")[-1] for n in names.split(",") if n.strip()}
    known = imported | declared_names(code) | exports_of(path)
    for name in set(re.findall(r"(?<![.\w$])(\w+)\s*\(", code)):
        owners = exported_anywhere.get(name, [])
        if name not in known and owners:
            raise SystemExit(f"{path.relative_to(SRC)} calls {name}() without importing it from {owners[0]}")


def convert(path: Path) -> str:
    text = path.read_text()
    check_imports(path)

    def replace_import(match):
        names = [n.strip() for n in match.group(1).split(",") if n.strip()]
        fields = ", ".join(n.replace(" as ", ": ") for n in names)
        return f"const {{ {fields} }} = {module_name((path.parent / match.group(2)).resolve())};"

    body = IMPORT.sub(replace_import, text)
    exports = sorted(exports_of(path))
    body = EXPORT_LIST.sub("", body)
    body = re.sub(r"^export\s+", "", body, flags=re.M)
    return f"const {module_name(path)} = (() => {{\n{body}\nreturn {{ {', '.join(exports)} }};\n}})();\n"


def bundle(entry: Path) -> str:
    order = []
    wrap(entry.resolve(), order, set())
    exported_anywhere = {}
    for module in SRC.rglob("*.js"):
        for name in exports_of(module):
            exported_anywhere.setdefault(name, []).append(str(module.relative_to(SRC)))
    for module in order:
        check_calls(module, exported_anywhere)
    return "(() => {\n'use strict';\n" + "".join(convert(p) for p in order) + "})();\n"


def data_url(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def write_app_files(out: Path, page: str):
    manifest = SRC / "ui" / "manifest.webmanifest"
    icons = sorted((ROOT / "assets" / "icons").glob("*.png"))
    shutil.copy(manifest, out / manifest.name)
    (out / "icons").mkdir(exist_ok=True)
    for icon in icons:
        shutil.copy(icon, out / "icons" / icon.name)
    files = ["./", manifest.name] + [f"icons/{icon.name}" for icon in icons]
    # a new page must change the worker's own bytes, or browsers keep the worker they have
    version = hashlib.sha256((page + manifest.read_text()).encode()).hexdigest()[:12]
    (out / "sw.js").write_text(
        f"globalThis.OFFLINE_CACHE = {json.dumps(f'pixel-clean-{version}')};\n"
        f"globalThis.OFFLINE_FILES = {json.dumps(files)};\n" + bundle(SRC / "worker" / "service-worker.js")
    )


def main():
    samples = json.loads((ROOT / "build" / "samples.json").read_text())
    sample = {key: data_url(ROOT / value) for key, value in samples.items()}
    worker = bundle(SRC / "worker" / "clean-worker.js")
    app = bundle(SRC / "ui" / "main.js")
    page = (SRC / "ui" / "page.html").read_text()
    script = (
        f"globalThis.CLEAN_WORKER_SOURCE = {json.dumps(worker)};\n"
        f"globalThis.SAMPLE = {json.dumps(sample)};\n"
        f"globalThis.GAME_KITS = {(ROOT / 'build' / 'game-kits.json').read_text()};\n" + app
    )
    # the stylesheets in name order: tokens first, then each part of the page
    styles = "\n".join(path.read_text() for path in sorted((SRC / "ui" / "styles").glob("*.css")))
    page = page.replace("/*STYLE*/", styles)
    page = page.replace("/*SCRIPT*/", script.replace("</script", "<\\/script"))
    out = ROOT / "dist" / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    write_app_files(out.parent, page)
    print(f"{out} {len(page) // 1024} KB")


if __name__ == "__main__":
    sys.exit(main())
