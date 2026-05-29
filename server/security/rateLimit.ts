/**
 * In-memory rate limiter (per serverless instance).
 * Set REDIS_URL for distributed limits in a future Redis adapter.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > maxRequests) {
    return { allowed: false, retryAfterMs: b.resetAt - now };
  }
  return { allowed: true };
}

export function rateLimitKey(sessionId: string, action: string): string {
  return `${sessionId}:${action}`;
}
