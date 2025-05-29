import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

const router = Router();

router.get('/', authMiddleware, rateLimit('fixed'), (_req: Request, res: Response) => {
  res.json({ success: true });
});

export default router;
