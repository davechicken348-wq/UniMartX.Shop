import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../controllers/auth.controller';
import { AppError } from './errorHandler';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const payload = authenticate(req);
  if (!payload || payload.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }
  (req as any).admin = payload;
  next();
}
