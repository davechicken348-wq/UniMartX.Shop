import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

let supabase: SupabaseClient | null = null;
let bucket: string = 'unimartx';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export function initializeR2(): void {
  const url       = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const b         = process.env.SUPABASE_BUCKET || 'unimartx';

  if (!url || !secretKey) {
    console.warn('⚠️  SUPABASE_URL or SUPABASE_SECRET_KEY not set. File uploads will use local storage.');
    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }
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
  if (!supabase) {
    const filePath = join(UPLOADS_DIR, key);
    const dir = join(filePath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, buffer);
    const ext = key.split('.').pop() || 'jpg';
    return `http://localhost:${process.env.PORT || 5000}/uploads/${key}`;
  }

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
