import { visitor } from './helpers.js';

export async function signedUp(server, email) {
  const browser = visitor(server.base);

  await browser('/api/account/signup', {
    method: 'POST',
    json: { email, password: 'pixels-forever' },
  });

  return browser;
}

export async function keyOf(browser) {
  return (await browser('/api/account/mcp-key', { method: 'POST' })).json.key.secret;
}

export function claude(server, key) {
  let id = 1;

  const post = async (body) => {
    const answer = await fetch(`${server.base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });

    return { status: answer.status, json: await answer.json().catch(() => null) };
  };

  return {
    post,
    async tool(name, args = {}) {
      const { json } = await post({
        jsonrpc: '2.0',
        id: id++,
        method: 'tools/call',
        params: { name, arguments: args },
      });
      const words = json.result.content.filter((part) => part.type === 'text');

      return {
        failed: Boolean(json.result.isError),
        said: words.map((part) => part.text).join('\n'),
        content: json.result.content,
      };
    },
  };
}
