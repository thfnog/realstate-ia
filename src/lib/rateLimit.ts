interface RateLimitStore {
  [key: string]: {
    tokens: number;
    lastRefill: number;
  };
}

const store: RateLimitStore = {};

const REFILL_RATE = 5; // tokens per minute
const BUCKET_SIZE = 10; // max tokens

/**
 * Simple in-memory rate limiter (Note: In serverless, this persists per instance/warm lambda)
 * For production, use Redis (Upstash) or similar.
 */
export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = store[identifier] || { tokens: BUCKET_SIZE, lastRefill: now };

  // Refill tokens
  const elapsedMs = now - entry.lastRefill;
  const refillTokens = Math.floor(elapsedMs / (60000 / REFILL_RATE));
  
  if (refillTokens > 0) {
    entry.tokens = Math.min(BUCKET_SIZE, entry.tokens + refillTokens);
    entry.lastRefill = now;
  }

  if (entry.tokens > 0) {
    entry.tokens--;
    store[identifier] = entry;
    return true;
  }

  return false;
}
