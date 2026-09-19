import * as crypto from 'crypto';

/**
 * Generates a cryptographically secure random token with an optional prefix.
 * @param prefix Prefix string prepended to the generated hex token.
 * @param bytesLength Number of random bytes of entropy to generate.
 * @returns Prefixed hex string.
 */
export function generateSecureToken(prefix = 'bx_live', bytesLength = 32): string {
  const entropy = crypto.randomBytes(bytesLength).toString('hex');
  return `${prefix}_${entropy}`;
}

/**
 * Computes a SHA-256 digest of an API key or raw secret string.
 * @param rawKey The raw secret or key to hash.
 * @returns Hex-encoded SHA-256 hash.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

/**
 * Compares two strings in constant time to defend against timing attacks.
 * @param a First string.
 * @param b Second string.
 * @returns True if both strings are byte-for-byte identical.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generates an HMAC-SHA256 signature for a string payload using a shared secret.
 * @param secret The signing secret key.
 * @param payload The serialized string payload to sign.
 * @returns Hex-encoded HMAC-SHA256 signature.
 */
export function signPayload(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * Verifies an HMAC-SHA256 signature against a string payload using constant-time comparison.
 * @param secret The signing secret key.
 * @param payload The serialized string payload that was signed.
 * @param signature The hex-encoded signature to verify.
 * @returns True if the signature is valid and authentic.
 */
export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expectedSignature = signPayload(secret, payload);
  return constantTimeCompare(expectedSignature, signature);
}

/**
 * Generates a collision-resistant entity identifier with an identifying prefix.
 * @param prefix Type prefix such as 'tnt' or 'key'.
 * @returns Formatted identifier string.
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const entropy = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${timestamp}_${entropy}`;
}
