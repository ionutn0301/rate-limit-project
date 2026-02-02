import { Response, NextFunction } from 'express';
import { FixedWindowRateLimiter } from '../services/rate-limit/fixed-window.js';
import { SlidingWindowRateLimiter } from '../services/rate-limit/sliding-window.js';
import { MemoryStorage } from '../services/storage/memory-storage.js';
import { clients } from '../config/clients.js';
import { IAuthRequest } from './auth.js';
import { IRateLimitStrategy } from '../models/rate-limit-strategy.js';

// Storage instances (shared across limiters for efficiency)
const memoryStorage = new MemoryStorage();

// Rate limiter instances using different strategies
const fixedWindowLimiter = new FixedWindowRateLimiter(memoryStorage);
const slidingWindowLimiter = new SlidingWindowRateLimiter(memoryStorage);

export type RateLimitStrategy = 'fixed' | 'sliding';

interface IRateLimitOptions {
  /** The rate limiting strategy to use */
  strategy?: RateLimitStrategy;
  /** Custom storage instance (optional, uses memory storage by default) */
  customLimiter?: IRateLimitStrategy;
}

/**
 * Rate limiting middleware factory
 *
 * Creates a middleware that applies rate limiting based on client configuration.
 * Supports multiple strategies:
 *
 * - 'fixed': Fixed window counter - simple and efficient, but susceptible to
 *   burst traffic at window boundaries
 *
 * - 'sliding': Sliding window log - more accurate rate limiting with smooth
 *   traffic distribution, but higher memory usage
 *
 * @param strategyOrOptions - Either a strategy name ('fixed' | 'sliding') or options object
 * @returns Express middleware function
 *
 * @example
 * // Using string strategy
 * router.get('/', authMiddleware, rateLimit('fixed'), handler);
 *
 * @example
 * // Using options object
 * router.get('/', authMiddleware, rateLimit({ strategy: 'sliding' }), handler);
 */
export const rateLimit = (strategyOrOptions: RateLimitStrategy | IRateLimitOptions = 'fixed') => {
  // Normalize options
  const options: IRateLimitOptions =
    typeof strategyOrOptions === 'string' ? { strategy: strategyOrOptions } : strategyOrOptions;

  const { strategy = 'fixed', customLimiter } = options;

  return async (req: IAuthRequest, res: Response, next: NextFunction): Promise<Response | void> => {
    if (!req.clientId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const client = clients.find(c => c.id === req.clientId);
    if (!client) {
      return res.status(401).json({
        error: 'Invalid client ID',
        code: 'INVALID_CLIENT',
      });
    }

    // Extract route from the base path
    const route = req.baseUrl.replace('/', '') || req.path.replace('/', '');
    const clientRateLimit = client.rateLimits[route];

    if (!clientRateLimit) {
      return res.status(400).json({
        error: `No rate limit configured for route: ${route}`,
        code: 'NO_RATE_LIMIT_CONFIG',
      });
    }

    // Select the appropriate limiter
    const limiter =
      customLimiter || (strategy === 'fixed' ? fixedWindowLimiter : slidingWindowLimiter);

    const isLimited = await limiter.isRateLimited(
      req.clientId,
      route,
      clientRateLimit.maxRequests,
      clientRateLimit.windowMs,
    );

    // Add rate limit headers for better client experience
    res.setHeader('X-RateLimit-Limit', clientRateLimit.maxRequests);
    res.setHeader('X-RateLimit-Window-Ms', clientRateLimit.windowMs);
    res.setHeader('X-RateLimit-Strategy', strategy);

    if (isLimited) {
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', Math.ceil(clientRateLimit.windowMs / 1000));

      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(clientRateLimit.windowMs / 1000),
        limit: clientRateLimit.maxRequests,
        windowMs: clientRateLimit.windowMs,
      });
    }

    next();
  };
};

/**
 * Export individual limiters for advanced usage or testing
 */
export { fixedWindowLimiter, slidingWindowLimiter, memoryStorage };
