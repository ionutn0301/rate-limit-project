import { IClientConfig } from '../models/client.js';

export const clients: IClientConfig[] = [
  {
    id: 'client-1',
    rateLimits: {
      foo: {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      },
      bar: {
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      },
    },
  },
  {
    id: 'client-2',
    rateLimits: {
      foo: {
        maxRequests: 20,
        windowMs: 60000, // 1 minute
      },
      bar: {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      },
    },
  },
];
