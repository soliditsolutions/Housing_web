/**
 * Sliding-window in-memory rate limiter keyed by IP.
 *
 * Production note: replace the store with a Redis ZADD/ZREMRANGEBYSCORE
 * pipeline when deploying behind multiple instances.
 */

type Entry = number[]; // timestamps (ms)

const store = new Map<string, Entry>();

// Cleanup stale keys every 5 minutes to avoid unbounded memory growth.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000; // 10 min max window
    for (const [key, ts] of store) {
      if (ts[ts.length - 1] < cutoff) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * Check whether `key` (typically an IP) has exceeded `limit` requests
 * within the last `windowMs` milliseconds.
 *
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfter: seconds }`.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now    = Date.now();
  const cutoff = now - windowMs;

  let ts = store.get(key);
  if (!ts) {
    ts = [];
    store.set(key, ts);
  }

  // Drop timestamps outside the window (slide).
  while (ts.length > 0 && ts[0] < cutoff) ts.shift();

  if (ts.length >= limit) {
    const retryAfter = Math.ceil((ts[0] + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  ts.push(now);
  return { allowed: true };
}
