import { Request, Response, NextFunction } from 'express';
import { clients } from '../config/clients.js';

export interface IAuthRequest extends Request {
  clientId?: string;
}

export const authMiddleware = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction,
): Response | void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const clientId = authHeader.split(' ')[1];
  const client = clients.find(c => c.id === clientId);

  if (!client) {
    return res.status(401).json({ error: 'Invalid client ID' });
  }

  req.clientId = clientId;
  next();
};
