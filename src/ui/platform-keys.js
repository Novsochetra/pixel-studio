const onMac = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');

// shortcuts are written with the Mac's ⌘; Windows and Linux press Ctrl for the same ones
export function keyNames(text, mac = onMac) {
  return mac ? text : text.replaceAll('⇧⌘', 'Ctrl+Shift+').replaceAll('⌘', 'Ctrl+');
}
