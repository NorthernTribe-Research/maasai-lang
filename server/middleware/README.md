# API Middleware and Security Implementation

This document describes the middleware implementation for the LinguaMaster AI Platform.

## Overview

The middleware layer provides comprehensive request validation, security, error handling, and logging for all API endpoints.

## Middleware Components

### 1. Request Validation Middleware (`validation.ts`)
**Requirements: 21.5, 25.4**

Validates and sanitizes all API request parameters to ensure data integrity and prevent injection attacks.

**Features:**
- `validateRequestBody(requiredFields)` - Validates required fields with detailed error messages
- `validateEmailField(fieldName)` - Validates email format
- `sanitizeRequestData` - Sanitizes all input data (body, query, params) to prevent injection attacks
- `validateNumericParam(paramName, options)` - Validates numeric parameters with min/max constraints
- `validateStringLength(fieldName, options)` - Validates string length constraints
- `validateArray(fieldName, options)` - Validates array fields with length constraints

**Error Response Format:**
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Security Middleware (`security.ts`)
**Requirements: 21.7, 25.2, 25.3**

Implements comprehensive security measures including CORS, rate limiting, HTTPS enforcement, and security headers.

**Features:**

#### Rate Limiting
- `apiLimiter` - 100 requests per 15 minutes for general API endpoints
- `authLimiter` - 5 requests per 15 minutes for authentication endpoints
- `aiLimiter` - 10 requests per minute for AI service endpoints

#### CORS Policy
- `corsMiddleware` - Configurable CORS with allowed origins
- Supports credentials and preflight requests
- Development mode allows all origins

#### HTTPS Enforcement
- `httpsEnforcement` - Enforces HTTPS in production
- Checks `x-forwarded-proto` and `x-forwarded-ssl` headers

#### Security Headers
- `securityHeaders` - Sets comprehensive security headers:
  - `X-Frame-Options: DENY` - Prevents clickjacking
  - `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
  - `X-XSS-Protection: 1; mode=block` - XSS protection
  - `Strict-Transport-Security` - HTTPS enforcement (production)
  - `Content-Security-Policy` - Restricts resource loading
  - `Referrer-Policy` - Controls referrer information
  - `Permissions-Policy` - Restricts browser features

#### Input Validation
- `validateInput` - Sanitizes all input data
- Removes null bytes and dangerous characters
- Limits string length to prevent DoS attacks

### 3. Error Handling Middleware (`errorHandler.ts`)
**Requirements: 21.6, 24.1, 24.3, 24.4, 24.6**

Provides global error handling with logging, categorization, and appropriate HTTP responses.

**Features:**
- `errorHandler` - Global error handler with severity categorization
- `notFoundHandler` - Handles 404 errors
- `asyncHandler` - Wraps async route handlers to catch errors
- `enhancedErrorHandler` - Handles specific error types (DB, JWT, validation, etc.)
- `CustomError` - Custom error class with status codes and severity levels

**Error Severity Levels:**
- `low` - Client errors (400-499)
- `medium` - General errors
- `high` - Server errors (500+)
- `critical` - Requires immediate attention

**Error Logging:**
- Logs all errors with timestamps and stack traces
- Includes request context (path, method, IP, userId)
- Categorizes errors by severity
- Hides sensitive details in production

### 4. Logging Middleware (`logging.ts`)
**Requirements: 24.1, 24.2**

Implements structured logging for all API requests, responses, and AI service interactions.

**Features:**

#### Request Logging
- `requestLogger` - Logs all API requests and responses
- Captures method, path, status code, duration, and user info
- Different log levels based on status code (error, warn, info)

#### AI Service Logging
- `aiServiceLogger(serviceName)` - Logs AI service interactions
- Tracks request/response timing
- Monitors AI service usage per user

#### Structured Logging
- `logEvent(eventType, eventData, userId)` - Logs specific events
- `logError(error, context)` - Logs errors with context

**Log Format:**
```json
{
  "method": "POST",
  "path": "/api/tutor/ask",
  "statusCode": 200,
  "duration": "1234ms",
  "ip": "127.0.0.1",
  "userId": "user-123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Integration

### Server Setup (`server/index.ts`)

The middleware is applied in the following order:

```typescript
// 1. Security middleware (first)
app.use(corsMiddleware);
app.use(securityHeaders);
app.use(httpsEnforcement);

// 2. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. Input validation and sanitization
app.use(validateInput);

// 4. Request logging
app.use(requestLogger);

// 5. Routes (registered via registerRoutes)

// 6. Error handling (last)
app.use(notFoundHandler);
app.use(errorHandler);
```

### Route-Level Middleware

AI service routes include specific logging:

```typescript
// Tutor routes
router.use(aiServiceLogger('AITeacher'));

// Voice routes
router.use(aiServiceLogger('VoiceTeaching'));

// Speech routes
router.use(aiServiceLogger('Speech'));

// Exercise routes
router.use(aiServiceLogger('Exercise'));

// Curriculum routes
router.use(aiServiceLogger('Curriculum'));
```

## Environment Variables

Configure security middleware via environment variables:

```env
# CORS Configuration
ALLOWED_ORIGINS=https://linguamaster.app,https://www.linguamaster.app

# Node Environment
NODE_ENV=production

# Logging Level
LOG_LEVEL=INFO
```

## Usage Examples

### Validating Request Body

```typescript
router.post('/api/profiles',
  requireAuth,
  validateRequestBody(['targetLanguage', 'nativeLanguage']),
  async (req, res) => {
    // Request body is validated and sanitized
    const { targetLanguage, nativeLanguage } = req.body;
    // ...
  }
);
```

### Validating Numeric Parameters

```typescript
router.get('/api/lessons/:lessonId',
  requireAuth,
  validateNumericParam('lessonId', { required: true, min: 1 }),
  async (req, res) => {
    // lessonId is validated as a number
    const lessonId = parseInt(req.params.lessonId);
    // ...
  }
);
```

### Rate Limiting AI Endpoints

```typescript
router.post('/api/ai/generate',
  requireAuth,
  aiLimiter,
  async (req, res) => {
    // Rate limited to 10 requests per minute
    // ...
  }
);
```

### Custom Error Handling

```typescript
import { CustomError } from '../middleware';

router.post('/api/resource', async (req, res, next) => {
  try {
    // ... your code
    if (!resource) {
      throw new CustomError('Resource not found', 404, 'low');
    }
  } catch (error) {
    next(error); // Handled by global error handler
  }
});
```

## Testing

The middleware has been integrated and tested with the existing application:

1. ✅ All middleware files compile without TypeScript errors
2. ✅ Middleware is properly integrated in server/index.ts
3. ✅ AI service routes include logging middleware
4. ✅ Security headers are applied to all requests
5. ✅ CORS policy is configured
6. ✅ Rate limiting is active on AI endpoints
7. ✅ Input validation and sanitization is applied globally
8. ✅ Error handling provides appropriate responses

## Security Best Practices

1. **Input Validation**: All user inputs are validated and sanitized
2. **Rate Limiting**: Prevents abuse of API and AI services
3. **HTTPS Enforcement**: Required in production
4. **Security Headers**: Comprehensive headers prevent common attacks
5. **CORS Policy**: Restricts cross-origin requests
6. **Error Handling**: Hides sensitive information in production
7. **Logging**: Tracks all requests and AI service usage

## Maintenance

### Adding New Validation Rules

Add new validators to `server/middleware/validation.ts`:

```typescript
export const validateCustomField = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Your validation logic
    next();
  };
};
```

### Adjusting Rate Limits

Modify rate limiters in `server/middleware/security.ts`:

```typescript
export const customLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too many requests' }
});
```

### Adding New Log Events

Use the logging utilities:

```typescript
import { logEvent } from '../middleware/logging';

logEvent('user_action', {
  action: 'profile_updated',
  details: { ... }
}, userId);
```

## Compliance

This implementation satisfies the following requirements:

- **21.5**: Validate all API request parameters
- **21.6**: Return appropriate HTTP status codes and error messages
- **21.7**: Implement rate limiting to prevent abuse
- **24.1**: Log all errors and API requests with timestamps
- **24.2**: Log AI service interactions
- **24.3**: Log errors with stack traces
- **24.4**: Categorize errors by severity
- **24.6**: Implement error boundaries
- **25.2**: Use HTTPS for production
- **25.3**: Implement CORS policies
- **25.4**: Validate and sanitize user inputs

## Future Enhancements

1. Add request/response compression
2. Implement API versioning middleware
3. Add request ID tracking for distributed tracing
4. Implement advanced rate limiting with Redis
5. Add metrics collection for monitoring
6. Implement request replay protection
7. Add API key authentication for external services
