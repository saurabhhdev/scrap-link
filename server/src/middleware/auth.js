import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';

export async function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError('Authentication is required.', 401));
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user || !user.isActive || user.tokenVersion !== payload.version) throw new AppError('Session is invalid or expired.', 401);
    request.auth = payload;
    request.user = user;
    next();
  } catch (error) { next(error instanceof AppError ? error : new AppError('Session is invalid or expired.', 401)); }
}

export const requireRole = (...roles) => (request, response, next) => roles.includes(request.auth.role) ? next() : next(new AppError('You do not have permission for this action.', 403));
