import { spawn } from 'node:child_process';

// The studio's own server (server/src/main.js) on a free port, over a database in memory: the
// flows of accounts need the API the static server used by the others does not have.
export function studioServer() {
  const child = spawn('node', ['server/src/main.js'], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', DATABASE_URL: '', S3_BUCKET: '' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  return new Promise((resolve, reject) => {
    child.once('exit', (code) => reject(new Error(`the studio's server stopped (${code})`)));
    child.stdout.on('data', (chunk) => {
      const port = String(chunk).match(/localhost:(\d+)/)?.[1];

      if (port) {
        resolve({ address: `http://localhost:${port}/`, stop: () => child.kill('SIGTERM') });
      }
    });
  });
}
