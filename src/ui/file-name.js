// A name as part of a file's name: lower case, its letters and digits of any script kept, the
// rest as hyphens. A name with neither ("!!!") gets the fallback, so no file is called ".json".
export function fileSlug(text, fallback = 'untitled') {
  const slug = String(text ?? '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

  return slug || fallback;
}
