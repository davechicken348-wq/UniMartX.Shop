import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle payload too large (file upload size limit)
  if (err.name === 'PayloadTooLargeError' || (err as any).type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: 'The uploaded file is too large. Please choose an image under 5MB.',
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // For Zod validation errors (handled by validate middleware)
  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  // Unexpected errors
  console.error('ERROR:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};
