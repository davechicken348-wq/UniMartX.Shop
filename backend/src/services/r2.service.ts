import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

let supabase: SupabaseClient | null = null;
let bucket: string = 'unimartx';

export function initializeR2(): void {
  const url       = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const b         = process.env.SUPABASE_BUCKET || 'unimartx';

  if (!url || !secretKey) {
    console.warn('⚠️  SUPABASE_URL or SUPABASE_SECRET_KEY not set. File uploads will be disabled.');
    return;
  }

  bucket   = b;
  supabase = createClient(url, secretKey);
  console.log(`✓ Supabase Storage initialized — bucket: ${bucket}`);
}

export function isR2Ready(): boolean {
  return supabase !== null;
}

export async function uploadToR2(key: string, buffer: Buffer, mime: string): Promise<string> {
  if (!supabase) throw new Error('Supabase storage not initialized');

  const { error } = await supabase.storage
    .from(bucket)
    .upload(key, buffer, { contentType: mime, upsert: true, cacheControl: '31536000' });

  if (error) {
    console.error('Supabase upload error:', { message: error.message, cause: (error as any).cause });
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

export async function deleteFromR2(urlOrKey: string): Promise<void> {
  if (!supabase) return;
  const key = urlOrKey.includes('/object/public/')
    ? urlOrKey.split(`/object/public/${bucket}/`)[1]
    : urlOrKey;
  await supabase.storage.from(bucket).remove([key]);
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

export function parseBase64(dataUrl: string): { buffer: Buffer; mime: string; ext: string } {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 image data');
  const mime   = match[1];
  const ext    = match[2] === 'jpeg' ? 'jpg' : match[2];
  const buffer = Buffer.from(match[3], 'base64');
  return { buffer, mime, ext };
}

export function extFromFilename(filename: string): string {
  return (filename.split('.').pop() || 'jpg').toLowerCase();
}
