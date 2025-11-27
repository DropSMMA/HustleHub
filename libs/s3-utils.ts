import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import getS3Client from "@/libs/s3";

const normalizeHost = (input?: string | null): string | null => {
  if (!input) {
    return null;
  }

  try {
    return new URL(input).host;
  } catch {
    return input.replace(/^https?:\/\//, "").split("/")[0] ?? null;
  }
};

const buildExpectedS3Hosts = (): Set<string> => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const hosts = new Set<string>();

  if (!bucket) {
    return hosts;
  }

  if (region) {
    hosts.add(`${bucket}.s3.${region}.amazonaws.com`);
    hosts.add(`${bucket}.s3-${region}.amazonaws.com`);
  }

  hosts.add(`${bucket}.s3.amazonaws.com`);

  return hosts;
};

export const resolveS3KeyFromUrl = (imageUrl: string): string | null => {
  try {
    const url = new URL(imageUrl);
    const cloudFrontHost = normalizeHost(process.env.AWS_CLOUDFRONT_DOMAIN);
    const s3Hosts = buildExpectedS3Hosts();

    if (
      url.host !== cloudFrontHost &&
      (s3Hosts.size === 0 || !s3Hosts.has(url.host))
    ) {
      return null;
    }

    const key = url.pathname.replace(/^\/+/, "");

    return key.length > 0 ? key : null;
  } catch (error) {
    console.error("[s3-utils][resolve-key]", error);
    return null;
  }
};

export const deleteS3ObjectByUrl = async (
  imageUrl?: string | null
): Promise<void> => {
  if (!imageUrl) {
    return;
  }

  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    console.warn("[s3-utils][delete] AWS_S3_BUCKET is not configured.");
    return;
  }

  const key = resolveS3KeyFromUrl(imageUrl);

  if (!key) {
    return;
  }

  try {
    const s3 = getS3Client();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (error) {
    console.error("[s3-utils][delete]", error);
  }
};