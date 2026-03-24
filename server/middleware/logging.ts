import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Logging middleware
 * Requirements: 24.1, 24.2
 */

/**
 * Request logging middleware
 * Logs all API requests with method, path, status, duration, and user info
 * Requirements: 24.1, 24.2
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const { method, path, ip } = req;
  const userId = (req as any).userId || 'anonymous';

  // Log request
  logger.info(`Incoming request: ${method} ${path}`, {
    method,
    path,
    ip,
    userId,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Capture response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    const logData = {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userId,
      timestamp: new Date().toISOString()
    };

    if (statusCode >= 500) {
      logger.error(`Request failed: ${method} ${path}`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`Request error: ${method} ${path}`, logData);
    } else {
      logger.info(`Request completed: ${method} ${path}`, logData);
    }
  });

  next();
};

/**
 * AI service interaction logging middleware
 * Logs requests to AI service endpoints
 * Requirements: 24.1, 24.2
 */
export const aiServiceLogger = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const userId = (req as any).userId || 'anonymous';

    logger.info(`AI service request: ${serviceName}`, {
      service: serviceName,
      userId,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });

    // Capture response
    const originalJson = res.json;
    res.json = function (body: any) {
      const duration = Date.now() - startTime;
      
      logger.info(`AI service response: ${serviceName}`, {
        service: serviceName,
        userId,
        endpoint: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Structured logging for specific events
 * Requirements: 24.1, 24.2
 */
export const logEvent = (
  eventType: string,
  eventData: Record<string, any>,
  userId?: string
) => {
  logger.info(`Event: ${eventType}`, {
    eventType,
    userId: userId || 'system',
    timestamp: new Date().toISOString(),
    ...eventData
  });
};

/**
 * Error logging helper
 * Requirements: 24.1, 24.3
 */
export const logError = (
  error: Error,
  context: {
    userId?: string;
    path?: string;
    method?: string;
    [key: string]: any;
  }
) => {
  logger.error(`Error occurred: ${error.message}`, {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });
};
