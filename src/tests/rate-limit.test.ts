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

    it('should track different clients separately', async () => {
      // Fill up rate limit for client-1
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited('client-1', endpoint, maxRequests, windowMs);
      }

      // client-2 should not be affected
      const isLimited = await rateLimiter.isRateLimited(
        'client-2',
        endpoint,
        maxRequests,
        windowMs,
      );
      expect(isLimited).toBe(false);
    });

    it('should track different endpoints separately', async () => {
      // Fill up rate limit for endpoint "foo"
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, 'foo', maxRequests, windowMs);
      }

      // Endpoint "bar" should not be affected
      const isLimited = await rateLimiter.isRateLimited(clientId, 'bar', maxRequests, windowMs);
      expect(isLimited).toBe(false);
    });

    it('should return correct remaining requests', async () => {
      const requestsMade = 5;
      for (let i = 0; i < requestsMade; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }

      const remaining = await rateLimiter.getRemainingRequests(
        clientId,
        endpoint,
        maxRequests,
        windowMs,
      );
      expect(remaining).toBe(maxRequests - requestsMade);
    });

    it('should demonstrate fixed window boundary issue (burst traffic)', async () => {
      // Make requests at the end of a window
      jest.setSystemTime(windowMs - 1000); // 1 second before window end

      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }

      // Move to the next window (just 1 second later)
      jest.advanceTimersByTime(1000);

      // Fixed window resets - allows another full batch immediately
      // This demonstrates the "burst at boundary" characteristic
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

    it('should maintain rate limit across sliding window (no boundary burst)', async () => {
      // Make requests at different times within the window
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
        jest.advanceTimersByTime(1000); // Space out requests by 1 second
      }

      // Even though we've advanced time, all requests are still within the window
      // Should still be rate limited
      const isLimited = await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      expect(isLimited).toBe(true);
    });

    it('should allow new requests as old ones expire from the sliding window', async () => {
      const startTime = Date.now();
      jest.setSystemTime(startTime);

      // Make maxRequests at time 0
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }

      // Verify we're rate limited
      let isLimited = await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      expect(isLimited).toBe(true);

      // Advance past the window - all old requests should expire
      jest.advanceTimersByTime(windowMs + 1);

      // Now we should be able to make requests again
      isLimited = await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      expect(isLimited).toBe(false);
    });

    it('should track different clients separately', async () => {
      // Fill up rate limit for client-1
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited('client-1', endpoint, maxRequests, windowMs);
      }

      // client-2 should not be affected
      const isLimited = await rateLimiter.isRateLimited(
        'client-2',
        endpoint,
        maxRequests,
        windowMs,
      );
      expect(isLimited).toBe(false);
    });

    it('should return correct remaining requests', async () => {
      const requestsMade = 5;
      for (let i = 0; i < requestsMade; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }

      const remaining = await rateLimiter.getRemainingRequests(
        clientId,
        endpoint,
        maxRequests,
        windowMs,
      );
      expect(remaining).toBe(maxRequests - requestsMade);
    });

    it('should correctly calculate reset time', async () => {
      const startTime = 1000000; // Fixed starting point
      jest.setSystemTime(startTime);

      // Make some requests
      for (let i = 0; i < 3; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }

      const resetTime = await rateLimiter.getResetTime(clientId, endpoint, windowMs);

      // Reset time should be approximately windowMs (time until oldest request expires)
      expect(resetTime).toBeLessThanOrEqual(windowMs);
      expect(resetTime).toBeGreaterThan(0);
    });

    it('should demonstrate sliding window prevents boundary bursts', async () => {
      // Unlike fixed window, sliding window tracks individual timestamps
      // Making requests at the end of a period still affects the next period

      const startTime = windowMs - 1000;
      jest.setSystemTime(startTime);

      // Make all requests 1 second before "window boundary"
      for (let i = 0; i < maxRequests; i++) {
        await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }

      // Advance 1 second (crosses what would be a fixed window boundary)
      jest.advanceTimersByTime(1000);

      // Sliding window still blocks because all requests are within the sliding window
      const isLimited = await rateLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      expect(isLimited).toBe(true);
    });
  });

  describe('Strategy Comparison', () => {
    it('should demonstrate the difference between fixed and sliding window', async () => {
      const fixedStorage = new MemoryStorage();
      const slidingStorage = new MemoryStorage();
      const fixedLimiter = new FixedWindowRateLimiter(fixedStorage);
      const slidingLimiter = new SlidingWindowRateLimiter(slidingStorage);

      // Set time just before a window boundary
      const boundaryTime = windowMs - 100;
      jest.setSystemTime(boundaryTime);

      // Both limiters accept maxRequests
      for (let i = 0; i < maxRequests; i++) {
        await fixedLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
        await slidingLimiter.isRateLimited(clientId, endpoint, maxRequests, windowMs);
      }

      // Cross the window boundary
      jest.advanceTimersByTime(200);

      // Fixed window resets - allows requests (potential burst)
      const fixedResult = await fixedLimiter.isRateLimited(
        clientId,
        endpoint,
        maxRequests,
        windowMs,
      );
      expect(fixedResult).toBe(false); // Allows request (new window)

      // Sliding window maintains history - still blocks
      const slidingResult = await slidingLimiter.isRateLimited(
        clientId,
        endpoint,
        maxRequests,
        windowMs,
      );
      expect(slidingResult).toBe(true); // Still blocks (requests in sliding window)
    });
  });
});
