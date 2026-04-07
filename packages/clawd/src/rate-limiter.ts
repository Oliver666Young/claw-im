import type { Tier } from '@claw-im/shared';
import { RATE_LIMIT } from '@claw-im/shared';

interface SlidingWindow {
  timestamps: number[];
}

export class RateLimiter {
  private windows = new Map<string, SlidingWindow>();

  /**
   * Check if a message to the given recipient is allowed under the tier's rate limit.
   * Returns true if allowed, false if rate-limited.
   */
  check(recipientId: string, tier: Tier): boolean {
    const limit = RATE_LIMIT[tier];
    if (limit === Infinity) return true;

    const now = Date.now();
    const windowMs = 60_000; // 1 minute

    let window = this.windows.get(recipientId);
    if (!window) {
      window = { timestamps: [] };
      this.windows.set(recipientId, window);
    }

    // Remove timestamps older than the window
    const cutoff = now - windowMs;
    window.timestamps = window.timestamps.filter((t) => t > cutoff);

    if (window.timestamps.length >= limit) {
      return false;
    }

    window.timestamps.push(now);
    return true;
  }

  /**
   * Get remaining quota for a recipient under their tier limit.
   */
  remaining(recipientId: string, tier: Tier): number {
    const limit = RATE_LIMIT[tier];
    if (limit === Infinity) return Infinity;

    const now = Date.now();
    const cutoff = now - 60_000;

    const window = this.windows.get(recipientId);
    if (!window) return limit;

    const recent = window.timestamps.filter((t) => t > cutoff).length;
    return Math.max(0, limit - recent);
  }
}
