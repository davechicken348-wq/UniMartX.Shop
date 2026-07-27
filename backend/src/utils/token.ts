import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param length Number of bytes (default: 32)
 * @returns URL-safe base64 token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Safely compare two tokens to prevent timing attacks
 * @param tokenA First token
 * @param tokenB Second token
 * @returns true if tokens are equal
 */
export function tokensEqual(tokenA: string, tokenB: string): boolean {
  const a = Buffer.from(tokenA, 'base64url');
  const b = Buffer.from(tokenB, 'base64url');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Calculate token expiration date
 * @param hours Number of hours from now (default: 24)
 * @returns DateTime for token expiry
 */
export function getTokenExpiry(hours: number = 24): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}
