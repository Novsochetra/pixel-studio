import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

// The layers' pictures in a private bucket. Nobody reads the bucket but the server, which sends a
// picture only to its owner (docs-api.js): no address of a file is ever given out.
export function createS3Files({ bucket, region }, client = new S3Client({ region })) {
  return {
    put: (key, bytes) =>
      client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: 'image/png' }),
      ),

    async get(key) {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

      return Buffer.from(await object.Body.transformToByteArray());
    },

    remove: (key) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })),
  };
}
