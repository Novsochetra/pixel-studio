import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFilesConfig } from '../src/files/files-config.js';
import { createS3Files } from '../src/files/s3-files.js';

test('a picture is put, read and removed in the bucket by its key', async () => {
  const sent = [];
  const client = {
    send: async (command) => {
      sent.push([command.constructor.name, command.input]);

      return { Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } };
    },
  };
  const files = createS3Files({ bucket: 'studio-files', region: 'ap-southeast-1' }, client);

  await files.put('users/1/layer.png', Buffer.from([1, 2, 3]));
  assert.deepEqual(await files.get('users/1/layer.png'), Buffer.from([1, 2, 3]));
  await files.remove('users/1/layer.png');

  assert.deepEqual(
    sent.map(([name, input]) => [name, input.Bucket, input.Key]),
    [
      ['PutObjectCommand', 'studio-files', 'users/1/layer.png'],
      ['GetObjectCommand', 'studio-files', 'users/1/layer.png'],
      ['DeleteObjectCommand', 'studio-files', 'users/1/layer.png'],
    ],
  );
  assert.equal(sent[0][1].ContentType, 'image/png');
});

test('the bucket is used only when it is named, and then needs its region', () => {
  assert.equal(readFilesConfig({ AWS_REGION: 'ap-southeast-1' }), null);
  assert.throws(() => readFilesConfig({ S3_BUCKET: 'studio-files' }), /AWS_REGION/);
  assert.deepEqual(readFilesConfig({ S3_BUCKET: 'studio-files', AWS_REGION: 'ap-southeast-1' }), {
    bucket: 'studio-files',
    region: 'ap-southeast-1',
  });
});
