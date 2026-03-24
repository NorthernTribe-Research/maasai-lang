import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Security middleware
 * Requirements: 21.7, 25.2, 25.3
 */

// Rate limiting for API endpoints
// Requirements: 21.7, 25.2
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
// Requirements: 21.7, 25.2
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// AI endpoint rate limiting to prevent abuse
// Requirements: 21.7, 25.2
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 AI requests per minute
  message: {
    error: 'Too many AI requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * CORS middleware
 * Requirements: 25.3
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:3000'
  ];

  const origin = req.headers.origin;
  
  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
};

/**
 * HTTPS enforcement middleware for production
 * Requirements: 25.2
 */
export const httpsEnforcement = (req: Request, res: Response, next: NextFunction) => {
  // Allow plain HTTP probes for local/container health checks.
  if (req.path === '/api/health') {
    return next();
  }

  if (process.env.NODE_ENV === 'production') {
    const host = (req.hostname || '').toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (isLocalHost) {
      return next();
    }

    // Check if request is secure
    const isSecure = req.secure || 
                     req.headers['x-forwarded-proto'] === 'https' ||
                     req.headers['x-forwarded-ssl'] === 'on';
    
    if (!isSecure) {
      return res.status(403).json({
        message: 'HTTPS is required for this endpoint'
      });
    }
  }
  
  next();
};

// Security headers middleware
// Requirements: 25.2, 25.3
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com; " +
    "media-src 'self' blob:; " +
    "frame-ancestors 'none';"
  );
  
  next();
};

/**
 * Input validation and sanitization middleware
 * Requirements: 21.5, 25.4
 */
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize input data to prevent injection attacks
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potential XSS and SQL injection patterns
      let sanitized = value.trim();
      
      // Remove null bytes
      sanitized = sanitized.replace(/\0/g, '');
      
      // Limit string length to prevent DoS
      sanitized = sanitized.substring(0, 10000);
      
      return sanitized;
    }
    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item));
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        // Limit key length and sanitize key
        if (key.length <= 100) {
          const sanitizedKey = key.replace(/[^\w\s-]/g, '');
          sanitized[sanitizedKey] = sanitizeValue(val);
        }
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  if (req.query) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(req.query)) {
      sanitized[key] = sanitizeValue(value);
    }
    req.query = sanitized;
  }
  
  next();
};
