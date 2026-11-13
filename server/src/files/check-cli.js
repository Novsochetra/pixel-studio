import { randomBytes } from 'node:crypto';
import { readFilesConfig } from './files-config.js';
import { createS3Files } from './s3-files.js';

// npm run storage:check, with Railway's variables (railway run): a small file is put in the
// bucket, read back and taken away, as the server does with a layer's picture.
const config = readFilesConfig(process.env);

if (config) {
  const files = createS3Files(config);
  const key = `checks/storage-check-${Date.now()}.txt`;
  const sent = randomBytes(16);

  await files.put(key, sent);
  const back = await files.get(key);

  await files.remove(key);
  console.log(
    back.equals(sent)
      ? `S3 works: put, read and removed ${key} in ${config.bucket}`
      : 'S3 gave back other bytes than were put.',
  );
} else {
  console.error('S3_BUCKET is not set, so there is no bucket to check.');
  process.exitCode = 1;
}
