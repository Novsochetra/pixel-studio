// Runs every browser flow (or those named) against the page at URL and says which passed.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const [url, images, shots, ...only] = process.argv.slice(2);
const here = new URL('.', import.meta.url).pathname;
const flows = readdirSync(here)
  .filter((name) => name.endsWith('.flow.mjs'))
  .filter((name) => !only.length || only.some((wanted) => name.startsWith(wanted)));
let failed = 0;

for (const flow of flows) {
  try {
    const out = execFileSync('node', [`${here}${flow}`, url, images, shots], {
      encoding: 'utf8',
      timeout: 600000,
    });

    console.log(
      `${flow}: ${out
        .trim()
        .split('\n')
        .find((line) => line.startsWith('RESULT'))}`,
    );
  } catch (error) {
    failed += 1;
    console.log(
      `${flow}: FAILED\n${(error.stdout || '').trim()}\n${(error.stderr || '').trim().split('\n').slice(0, 8).join('\n')}`,
    );
  }
}

console.log(
  failed ? `${failed} of ${flows.length} flows failed` : `all ${flows.length} flows passed`,
);
process.exit(failed ? 1 : 0);
