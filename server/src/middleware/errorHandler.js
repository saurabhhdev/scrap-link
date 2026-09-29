import { AppError } from '../utils/AppError.js';

export function notFound(request, response, next) { next(new AppError(`Route ${request.method} ${request.originalUrl} was not found.`, 404)); }

export function errorHandler(error, request, response, next) {
  const uploadError = error.name === 'MulterError';
  const statusCode = error.statusCode || (error.name === 'ValidationError' || uploadError ? 400 : 500);
  const message = uploadError ? (error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or less.' : 'Invalid image upload.') : (error.isOperational || error.name === 'ValidationError' ? error.message : 'Internal server error.');
  response.status(statusCode).json({ success: false, message, ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}) });
}
