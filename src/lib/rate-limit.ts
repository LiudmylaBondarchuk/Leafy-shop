const requests = new Map<string, { count: number; resetAt: number }>();

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  lockedUntil?: number; // epoch ms when lockout expires
}

/**
 * General-purpose rate limiter with a sliding window.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = requests.get(key);

  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

/**
 * Login/forgot-password rate limiter.
 * After `LOCKOUT_MAX_ATTEMPTS` failed calls the account is locked for 5 minutes.
 * Returns `lockedUntil` (epoch ms) when locked so the client can show a countdown.
 * Call `resetLoginRateLimit(key)` on a successful login to clear the counter.
 */
export function loginRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = requests.get(key);

  // Currently locked out
  if (entry && entry.count >= LOCKOUT_MAX_ATTEMPTS && now < entry.resetAt) {
    return { success: false, remaining: 0, lockedUntil: entry.resetAt };
  }

  // Lockout expired — reset
  if (entry && now >= entry.resetAt) {
    requests.delete(key);
  }

  const current = requests.get(key);

  if (!current) {
    requests.set(key, { count: 1, resetAt: now + LOCKOUT_DURATION_MS });
    return { success: true, remaining: LOCKOUT_MAX_ATTEMPTS - 1 };
  }

  current.count++;

  if (current.count >= LOCKOUT_MAX_ATTEMPTS) {
    // Just hit the limit — lock for 5 minutes from now
    current.resetAt = now + LOCKOUT_DURATION_MS;
    return { success: false, remaining: 0, lockedUntil: current.resetAt };
  }

  return { success: true, remaining: LOCKOUT_MAX_ATTEMPTS - current.count };
}

/**
 * Reset the login rate-limit counter (call after successful authentication).
 */
export function resetLoginRateLimit(key: string): void {
  requests.delete(key);
}
