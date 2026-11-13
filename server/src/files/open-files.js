import { readFilesConfig } from './files-config.js';
import { createS3Files } from './s3-files.js';

// With no bucket set, a layer's picture stays in its document in Postgres: it works, but the
// database grows with every picture (docs/deploy-railway.md says how to set the bucket).
export function openFiles(env) {
  const config = readFilesConfig(env);

  return config
    ? { files: createS3Files(config), description: `Layer pictures in S3 (${config.bucket})` }
    : { files: null, description: 'Layer pictures in Postgres (set S3_BUCKET to keep them in S3)' };
}
