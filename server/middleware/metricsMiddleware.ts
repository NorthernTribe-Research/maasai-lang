import { Request, Response, NextFunction } from 'express';
import { metricsCollector } from '../utils/MetricsCollector';

/**
 * Metrics collection middleware
 * Automatically tracks HTTP request metrics
 * Requirements: 12.1
 */

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Track active connections
  const originalEnd = res.end;
  let ended = false;
  
  res.end = function(this: Response, ...args: any[]): Response {
    if (!ended) {
      ended = true;
      const duration = Date.now() - startTime;
      
      // Record metrics
      metricsCollector.recordRequest(
        req.method,
        req.path,
        res.statusCode,
        duration
      );
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
}
