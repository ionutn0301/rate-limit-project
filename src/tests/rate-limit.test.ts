import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { FixedWindowRateLimiter } from '../services/rate-limit/fixed-window.js';
import { SlidingWindowRateLimiter } from '../services/rate-limit/sliding-window.js';
import { MemoryStorage } from '../services/storage/memory-storage.js';

describe('Rate Limiting Tests', () => {
  const clientId = 'client-1';
  const endpoint = 'foo';
  const maxRequests = 10;
  const windowMs = 60000; // 1 minute

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Fixed Window Rate Limiter', () => {
    let rateLimiter: FixedWindowRateLimiter;
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage();
      rateLimiter = new FixedWindowRateLimiter(storage);
    });

    it('should allow requests within rate limit', async () => {
      for (let i = 0; i < maxRequests; i++) {
        const isLimited = await rateLimiter.isRateLimited(
          clientId,
          endpoint,
          maxRequests,
          windowMs,
        );
        expect(isLimited).toBe(false);
      }
    });

    it('should block requests exceeding rate limit', async () => {
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }
      const isLimited = await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      expect(isLimited).toBe(true);
    });

    it('should reset counter after window expires', async () => {
      // Fill up the rate limit
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }

      // Fast forward time by 1 minute
      jest.advanceTimersByTime(windowMs);
      await Promise.resolve(); // Allow async operations to complete

      // Should allow new requests
      const isLimited = await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      expect(isLimited).toBe(false);
    });
  });

  describe('Sliding Window Rate Limiter', () => {
    let rateLimiter: SlidingWindowRateLimiter;
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage();
      rateLimiter = new SlidingWindowRateLimiter(storage);
    });

    it('should allow requests within rate limit', async () => {
      for (let i = 0; i < maxRequests; i++) {
        const isLimited = await rateLimiter.isRateLimited(
          clientId,
          endpoint,
          maxRequests,
          windowMs,
        );
        expect(isLimited).toBe(false);
      }
    });

    it('should block requests exceeding rate limit', async () => {
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }
      const isLimited = await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      expect(isLimited).toBe(true);
    });

    it('should maintain rate limit across sliding window', async () => {
      // Make requests at different times within the window
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }
      jest.advanceTimersByTime(windowMs / 2); // 30 seconds
      await Promise.resolve(); // Allow async operations to complete

      // Should still be rate limited
      const isLimited = await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      expect(isLimited).toBe(true);
    });
  });
});
