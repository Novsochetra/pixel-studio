#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { answer } from './local.js';

// Claude Code starts this and talks to it over its input and output, a message a line
// (.mcp.json at the repo's root names it). Nothing else may be written to the output.
const lines = createInterface({ input: process.stdin });

lines.on('line', async (line) => {
  if (!line.trim()) {
    return;
  }

  let reply;

  try {
    reply = await answer(JSON.parse(line));
  } catch {
    reply = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } };
  }

  if (reply) {
    process.stdout.write(`${JSON.stringify(reply)}\n`);
  }
});
