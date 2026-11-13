import { fileKeyOf, pictureOf, pictureUrl } from './doc-keys.js';

const UPSERT =
  'INSERT INTO documents (user_id, key, data, file_key, updated_at) VALUES ($1, $2, $3, $4, now()) ON CONFLICT (user_id, key) DO UPDATE SET data = EXCLUDED.data, file_key = EXCLUDED.file_key, updated_at = now()';

// A document's row: its picture, where there is a bucket, goes there first, and the row keeps the
// rest and where the picture is. A row is written only once its picture is safe.
async function rowOf(files, { userId, key, data }) {
  const picture = files && pictureOf(data);

  if (!picture) {
    return { data, fileKey: null };
  }

  const fileKey = fileKeyOf(userId, key);

  await files.put(fileKey, picture);

  return { data: { ...data, png: null }, fileKey };
}

// An account's saved work, a document a key; `files` the bucket for layers' pictures, or null.
export function createDocsStore(database, files = null) {
  const write = (query, userId, [key, row]) =>
    query(UPSERT, [userId, key, JSON.stringify(row.data), row.fileKey]);

  return {
    async read(userId, key) {
      const { rows } = await database.query(
        'SELECT data, file_key FROM documents WHERE user_id = $1 AND key = $2',
        [userId, key],
      );
      const [row] = rows;

      if (!row || !row.file_key) {
        return row?.data ?? null;
      }

      return { ...row.data, png: pictureUrl(await files.get(row.file_key)) };
    },

    // every document together: all are kept, or none
    async writeAll(userId, entries) {
      const rows = [];

      for (const [key, data] of entries) {
        rows.push([key, await rowOf(files, { userId, key, data })]);
      }

      await database.transaction(async (query) => {
        for (const entry of rows) {
          await write(query, userId, entry);
        }
      });
    },

    async remove(userId, key) {
      const { rows } = await database.query(
        'DELETE FROM documents WHERE user_id = $1 AND key = $2 RETURNING file_key',
        [userId, key],
      );

      if (rows[0]?.file_key) {
        await files?.remove(rows[0].file_key);
      }
    },
  };
}
