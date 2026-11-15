/**
 * Client-Side Authentication Rate Limiter
 * Protects login and registration forms from brute-force attempts.
 */

const STORAGE_KEY = 'fleetmind_auth_rate_limit';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_MS = 60 * 1000;    // 60 seconds lockout

interface RateLimitState {
  attempts: number[];
  lockoutUntil: number | null;
}

function getState(): RateLimitState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: [], lockoutUntil: null };
    return JSON.parse(raw);
  } catch {
    return { attempts: [], lockoutUntil: null };
  }
}

function saveState(state: RateLimitState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export const rateLimiter = {
  /**
   * Checks if login is currently permitted.
   * Returns { allowed: boolean, remainingSeconds?: number }
   */
  check(): { allowed: boolean; remainingSeconds?: number } {
    const state = getState();
    const now = Date.now();

    // Check if currently locked out
    if (state.lockoutUntil && state.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((state.lockoutUntil - now) / 1000);
      return { allowed: false, remainingSeconds };
    }

    return { allowed: true };
  },

  /**
   * Records a failed login attempt.
   * Returns remaining lockout seconds if this attempt triggered a lockout.
   */
  recordFailure(): { lockedOut: boolean; remainingSeconds?: number } {
    const state = getState();
    const now = Date.now();

    // Filter out attempts older than WINDOW_MS
    const recentAttempts = state.attempts.filter(t => now - t < WINDOW_MS);
    recentAttempts.push(now);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
      const lockoutUntil = now + COOLDOWN_MS;
      saveState({ attempts: recentAttempts, lockoutUntil });
      return { lockedOut: true, remainingSeconds: Math.ceil(COOLDOWN_MS / 1000) };
    }

    saveState({ attempts: recentAttempts, lockoutUntil: null });
    return { lockedOut: false };
  },

  /**
   * Resets rate limiter on successful login.
   */
  reset(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
};
