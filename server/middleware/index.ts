/**
 * Middleware exports
 * Centralized export for all middleware modules
 */

// Authentication middleware
export {
  generateToken,
  verifyToken,
  authenticateJWT,
  optionalAuthenticateJWT,
  requireAuth,
  requireAdmin,
  getUserId,
  refreshToken
} from './auth';

// Validation middleware
export {
  validateRequestBody,
  validateEmailField,
  sanitizeRequestData,
  validateNumericParam,
  validateStringLength,
  validateArray
} from './validation';

// Security middleware
export {
  apiLimiter,
  authLimiter,
  aiLimiter,
  corsMiddleware,
  httpsEnforcement,
  securityHeaders,
  validateInput
} from './security';

// Error handling middleware
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  enhancedErrorHandler,
  CustomError,
  ErrorSeverity
} from './errorHandler';

// Logging middleware
export {
  requestLogger,
  aiServiceLogger,
  logEvent,
  logError
} from './logging';
