import { IRateLimits } from './types.js';

/**
 * Configuration for a client's rate limiting settings
 */
export interface IClientConfig {
  /** Unique identifier for the client */
  id: string;
  /** Rate limit configuration for each endpoint */
  rateLimits: IRateLimits;
}
