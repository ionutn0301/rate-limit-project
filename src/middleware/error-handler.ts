import { Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: Error | AppError, _req: Request, res: Response): Response => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      status: 'error',
      isOperational: err.isOperational,
    });
  }

  // For unknown errors, return 500
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    status: 'error',
    isOperational: false,
  });
};
