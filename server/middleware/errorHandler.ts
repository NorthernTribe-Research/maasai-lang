import { Request, Response, NextFunction } from 'express';

/**
 * Error handling middleware
 * Requirements: 21.6, 24.1, 24.3, 24.4, 24.6
 */

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Custom error class
 */
export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string,
    statusCode: number = 500,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.severity = severity;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Log error with timestamp and stack trace
 * Requirements: 24.1, 24.3
 */
const logError = (error: AppError, req: Request) => {
  const timestamp = new Date().toISOString();
  const severity = error.severity || 'medium';
  
  console.error(`[${timestamp}] [${severity.toUpperCase()}] Error:`, {
    message: error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).userId || 'anonymous',
    stack: error.stack
  });

  // In production, you would send critical errors to monitoring service
  if (severity === 'critical') {
    // Send to error monitoring service (e.g., Sentry, DataDog)
    console.error('CRITICAL ERROR - Immediate attention required!');
  }
};

/**
 * Determine error severity based on status code and error type
 * Requirements: 24.4
 */
const determineErrorSeverity = (error: AppError): 'low' | 'medium' | 'high' | 'critical' => {
  if (error.severity) {
    return error.severity;
  }

  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    return 'high';
  } else if (statusCode >= 400) {
    return 'low';
  }

  return 'medium';
};

/**
 * Global error handler middleware
 * Requirements: 21.6, 24.1, 24.6
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default values
  error.statusCode = error.statusCode || 500;
  error.severity = determineErrorSeverity(error);

  // Log the error
  logError(error, req);

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse: any = {
    success: false,
    message: error.message || 'Internal server error',
    statusCode: error.statusCode,
    timestamp: new Date().toISOString()
  };

  // Include stack trace in development
  if (isDevelopment) {
    errorResponse.stack = error.stack;
    errorResponse.severity = error.severity;
  }

  res.status(error.statusCode).json(errorResponse);
};

/**
 * Handle 404 - Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'low'
  );
  next(error);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle specific error types
 */
export const handleSpecificErrors = (error: any): AppError => {
  // Database errors
  if (error.code === '23505') { // PostgreSQL unique violation
    return new CustomError('Duplicate entry found', 409, 'low');
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return new CustomError('Referenced record not found', 400, 'low');
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new CustomError('Invalid token', 401, 'medium');
  }

  if (error.name === 'TokenExpiredError') {
    return new CustomError('Token expired', 401, 'low');
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return new CustomError(error.message, 400, 'low');
  }

  // Multer errors (file upload)
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new CustomError('File too large', 413, 'low');
    }
    return new CustomError('File upload error', 400, 'low');
  }

  // Default error
  return error;
};

/**
 * Error handler with specific error type handling
 */
export const enhancedErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const processedError = handleSpecificErrors(error);
  errorHandler(processedError, req, res, next);
};
