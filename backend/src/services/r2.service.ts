import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

let s3: S3Client | null = null;
let bucket: string = '';
let publicUrl: string = '';

export function initializeR2(): void {
  const accountId  = process.env.R2_ACCOUNT_ID;
  const accessKey  = process.env.R2_ACCESS_KEY_ID;
  const secretKey  = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const pub        = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKey || !secretKey || !bucketName || !pub) {
    console.warn('⚠️  R2 credentials not fully configured. File uploads will be disabled.');
    return;
  }

  bucket    = bucketName;
  publicUrl = pub.replace(/\/$/, '');

  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  console.log(`✓ R2 storage initialized — bucket: ${bucket}`);
}

export function isR2Ready(): boolean {
  return s3 !== null;
}

/**
 * Upload a buffer to R2.
 * @param key    Full object key e.g. sellers/abc123/avatar/img.jpg
 * @param buffer File buffer
 * @param mime   MIME type e.g. image/jpeg
 * @returns      Public URL of the uploaded file
 */
export async function uploadToR2(key: string, buffer: Buffer, mime: string): Promise<string> {
  if (!s3) throw new Error('R2 not initialized');
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mime,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${publicUrl}/${key}`;
}

/**
 * Delete an object from R2 by its full public URL or key.
 */
export async function deleteFromR2(urlOrKey: string): Promise<void> {
  if (!s3) return;
  const key = urlOrKey.startsWith('http')
    ? urlOrKey.replace(`${publicUrl}/`, '')
    : urlOrKey;
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// ── Key builders ──────────────────────────────────────────────

export function sellerAvatarKey(sellerId: string, ext: string): string {
  return `sellers/${sellerId}/avatar/${randomUUID()}.${ext}`;
}

export function sellerBannerKey(sellerId: string, ext: string): string {
  return `sellers/${sellerId}/banner/${randomUUID()}.${ext}`;
}

export function sellerStoreAvatarKey(sellerId: string, ext: string): string {
  return `sellers/${sellerId}/store-avatar/${randomUUID()}.${ext}`;
}

export function productImageKey(sellerId: string, productId: string, ext: string): string {
  return `sellers/${sellerId}/products/${productId}/${randomUUID()}.${ext}`;
}

export function evidenceKey(sellerId: string, orderId: string, ext: string): string {
  return `sellers/${sellerId}/evidence/${orderId}/${randomUUID()}.${ext}`;
}

// ── Helpers ───────────────────────────────────────────────────

/** Parse a base64 data URL → { buffer, mime, ext } */
export function parseBase64(dataUrl: string): { buffer: Buffer; mime: string; ext: string } {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 image data');
  const mime = match[1];
  const ext  = match[2] === 'jpeg' ? 'jpg' : match[2];
  const buffer = Buffer.from(match[3], 'base64');
  return { buffer, mime, ext };
}

/** Get ext from original filename */
export function extFromFilename(filename: string): string {
  return (filename.split('.').pop() || 'jpg').toLowerCase();
}
