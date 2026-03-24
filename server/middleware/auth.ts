import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';

// JWT configuration
const JWT_EXPIRES_IN = '24h'; // 24 hours session timeout

function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }

  return 'development-only-jwt-secret-do-not-use-in-production';
}

export interface JWTPayload {
  userId: string;
  username: string;
  email?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for authenticated user
 * Requirements: 1.3, 21.4
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username || '',
    email: user.email || undefined
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Verify and decode JWT token
 * Requirements: 1.3, 21.4
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to authenticate requests using JWT token
 * Requirements: 1.3, 21.4, 25.5
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Check for token in Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      message: 'Authentication required. Please provide a valid token.' 
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      message: 'Invalid or expired token. Please login again.' 
    });
  }

  // Check if token is expired (additional check)
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    return res.status(401).json({ 
      message: 'Token has expired. Please login again.' 
    });
  }

  // Attach user info to request
  (req as any).userId = decoded.userId;
  (req as any).username = decoded.username;
  
  next();
}

/**
 * Optional JWT authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export function optionalAuthenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (decoded && decoded.exp && decoded.exp * 1000 >= Date.now()) {
    (req as any).userId = decoded.userId;
    (req as any).username = decoded.username;
  }
  
  next();
}

/**
 * Middleware to check if user is authenticated (session-based or JWT)
 * Requirements: 1.3
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session-based auth first
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Check JWT auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded && decoded.exp && decoded.exp * 1000 >= Date.now()) {
      (req as any).userId = decoded.userId;
      (req as any).username = decoded.username;
      return next();
    }
  }

  return res.status(401).json({ 
    message: 'Authentication required. Please login.' 
  });
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ 
      message: 'Admin access required.' 
    });
  }
  next();
}

/**
 * Extract user ID from request (works with both session and JWT)
 */
export function getUserId(req: Request): string | null {
  // Try session-based auth first
  if (req.user && req.user.id) {
    return req.user.id;
  }

  // Try JWT auth
  if ((req as any).userId) {
    return (req as any).userId;
  }

  return null;
}

/**
 * Refresh token - generate new token with extended expiration
 * Requirements: 25.5
 */
export function refreshToken(oldToken: string): string | null {
  const decoded = verifyToken(oldToken);
  
  if (!decoded) {
    return null;
  }

  // Generate new token with same payload but new expiration
  const payload: JWTPayload = {
    userId: decoded.userId,
    username: decoded.username,
    email: decoded.email
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN
  });
}
