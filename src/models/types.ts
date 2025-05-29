/**
 * Configuration for rate limiting a specific endpoint
 */
export interface IRateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limit configuration for all endpoints
 */
export interface IRateLimits {
  [endpoint: string]: IRateLimitConfig;
}
