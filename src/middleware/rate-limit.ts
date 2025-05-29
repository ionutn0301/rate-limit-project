import { Response, NextFunction } from 'express';
import { FixedWindowRateLimiter } from '../services/rate-limit/fixed-window.js';
import { SlidingWindowRateLimiter } from '../services/rate-limit/sliding-window.js';
import { MemoryStorage } from '../services/storage/memory-storage.js';
import { RedisStorage } from '../services/storage/redis-storage.js';
import { clients } from '../config/clients.js';
import { IAuthRequest } from './auth.js';

// Create different rate limiters for different routes
const memoryStorage = new MemoryStorage();
const redisStorage = new RedisStorage();

const fixedWindowLimiter = new FixedWindowRateLimiter(memoryStorage);
const slidingWindowLimiter = new SlidingWindowRateLimiter(redisStorage);

export const rateLimit = (type: 'fixed' | 'sliding' = 'fixed') => {
  return async (req: IAuthRequest, res: Response, next: NextFunction): Promise<Response | void> => {
    if (!req.clientId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = clients.find(c => c.id === req.clientId);
    if (!client) {
      return res.status(401).json({ error: 'Invalid client ID' });
    }

    // Extract route from the base path
    const route = req.baseUrl.replace('/', '');
    const clientRateLimit = client.rateLimits[route];

    if (!clientRateLimit) {
      return res.status(400).json({ error: 'No rate limit configured for this route' });
    }

    const isTypeFixed = type === 'fixed';
    const limiter = isTypeFixed ? fixedWindowLimiter : slidingWindowLimiter;

    const isLimited = await limiter.isRateLimited(
      req.clientId,
      route,
      clientRateLimit.maxRequests,
      clientRateLimit.windowMs,
    );

    if (isLimited) {
      return res.status(429).json({ error: 'rate limit exceeded' });
    }

    next();
  };
};
