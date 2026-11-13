// S3_BUCKET alone turns the bucket on, so a shell that sets AWS_REGION for other tools keeps it off.
export function readFilesConfig(env) {
  const bucket = env.S3_BUCKET?.trim();

  if (!bucket) {
    return null;
  }

  const region = env.AWS_REGION?.trim();

  if (!region) {
    throw new Error(
      'S3_BUCKET is set, so AWS_REGION must be too (the bucket region, ap-southeast-1)',
    );
  }

  return { bucket, region };
}
