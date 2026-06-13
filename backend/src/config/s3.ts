import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.AWS_S3_BUCKET ?? process.env.AWS_BUCKET_NAME ?? "";

export const isS3Configured = (): boolean =>
  Boolean(
    BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY,
  );

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "placeholder",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "placeholder",
  },
});

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType = "image/jpeg",
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}
