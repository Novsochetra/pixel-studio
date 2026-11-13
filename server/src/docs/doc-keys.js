// The studio's own keys (src/store/keys.js): letters, digits and dashes. Nothing else is taken,
// so a key never reaches a path or a query as anything but a name.
const KEY = /^[A-Za-z0-9_.-]{1,200}$/;

export const isDocKey = (key) => typeof key === 'string' && KEY.test(key) && !key.includes('..');

const PNG_URL = 'data:image/png;base64,';

// a layer's picture, as the studio keeps it in its document: { png: 'data:image/png;base64,…' }
export const pictureOf = (data) =>
  typeof data?.png === 'string' && data.png.startsWith(PNG_URL)
    ? Buffer.from(data.png.slice(PNG_URL.length), 'base64')
    : null;

export const pictureUrl = (bytes) => PNG_URL + bytes.toString('base64');

// where an account's picture is in the bucket: under the account's own folder
export const fileKeyOf = (userId, key) => `users/${userId}/${key}.png`;
