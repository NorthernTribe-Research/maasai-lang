import compression from 'compression';
import { Request, Response } from 'express';

/**
 * Compression middleware configuration
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

/**
 * Compression filter - only compress text-based responses
 */
function shouldCompress(req: Request, res: Response): boolean {
  // Don't compress if client doesn't accept encoding
  if (req.headers['x-no-compression']) {
    return false;
  }
  
  // Use compression's default filter
  return compression.filter(req, res);
}

/**
 * Compression middleware with optimal settings
 * - Enables gzip compression for all text-based responses
 * - Enables Brotli compression where supported
 * - Compresses responses larger than 1KB
 * - Sets appropriate compression levels
 */
export const compressionMiddleware = compression({
  // Compression level (1-9, where 6 is default and balances CPU vs compression ratio)
  level: 6,
  
  // Minimum response size to compress (1KB)
  threshold: 1024,
  
  // Filter function to determine what to compress
  filter: shouldCompress,
  
  // Memory level (1-9, where 8 is default)
  memLevel: 8,
  
  // Strategy for compression algorithm
  strategy: compression.Z_DEFAULT_STRATEGY,
});
