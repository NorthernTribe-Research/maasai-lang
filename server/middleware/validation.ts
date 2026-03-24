import { Request, Response, NextFunction } from 'express';
import { isValidEmail, sanitizeInput } from '../utils/validation';

/**
 * Request validation middleware
 * Requirements: 21.5, 25.4
 */

/**
 * Validate request body parameters with detailed error messages
 * Requirements: 21.5
 */
export const validateRequestBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields: string[] = [];
    const invalidFields: { field: string; reason: string }[] = [];

    for (const field of requiredFields) {
      if (!req.body || req.body[field] === undefined || req.body[field] === null) {
        missingFields.push(field);
      } else if (req.body[field] === '') {
        invalidFields.push({ field, reason: 'cannot be empty' });
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields,
        timestamp: new Date().toISOString()
      });
    }

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field values',
        invalidFields,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Validate email format in request with appropriate error message
 * Requirements: 21.5
 */
export const validateEmailField = (fieldName: string = 'email') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const email = req.body[fieldName];

    if (!email) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} is required`,
        timestamp: new Date().toISOString()
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format. Please provide a valid email address.',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Sanitize all input data to prevent injection attacks
 * Requirements: 25.4
 */
export const sanitizeRequestData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }

  if (req.query) {
    const sanitizedQuery: any = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        sanitizedQuery[key] = sanitizeInput(value);
      } else if (Array.isArray(value)) {
        sanitizedQuery[key] = value.map(v => typeof v === 'string' ? sanitizeInput(v) : v);
      } else {
        sanitizedQuery[key] = value;
      }
    }
    req.query = sanitizedQuery;
  }

  if (req.params) {
    const sanitizedParams: any = {};
    for (const [key, value] of Object.entries(req.params)) {
      sanitizedParams[key] = sanitizeInput(value);
    }
    req.params = sanitizedParams;
  }

  next();
};

/**
 * Validate numeric parameters with appropriate error messages
 * Requirements: 21.5
 */
export const validateNumericParam = (paramName: string, options?: {
  min?: number;
  max?: number;
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName] || req.query[paramName] || req.body[paramName];

    if (value === undefined || value === null) {
      if (options?.required) {
        return res.status(400).json({
          success: false,
          message: `${paramName} is required`,
          timestamp: new Date().toISOString()
        });
      }
      return next();
    }

    const numValue = Number(value);

    if (isNaN(numValue)) {
      return res.status(400).json({
        success: false,
        message: `${paramName} must be a valid number`,
        timestamp: new Date().toISOString()
      });
    }

    if (options?.min !== undefined && numValue < options.min) {
      return res.status(400).json({
        success: false,
        message: `${paramName} must be at least ${options.min}`,
        timestamp: new Date().toISOString()
      });
    }

    if (options?.max !== undefined && numValue > options.max) {
      return res.status(400).json({
        success: false,
        message: `${paramName} must be at most ${options.max}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Validate string length with appropriate error messages
 * Requirements: 21.5
 */
export const validateStringLength = (fieldName: string, options: {
  min?: number;
  max?: number;
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName];

    if (!value) {
      if (options.required) {
        return res.status(400).json({
          success: false,
          message: `${fieldName} is required`,
          timestamp: new Date().toISOString()
        });
      }
      return next();
    }

    if (typeof value !== 'string') {
      return res.status(400).json({
        success: false,
        message: `${fieldName} must be a string`,
        timestamp: new Date().toISOString()
      });
    }

    if (options.min !== undefined && value.length < options.min) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} must be at least ${options.min} characters`,
        timestamp: new Date().toISOString()
      });
    }

    if (options.max !== undefined && value.length > options.max) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} must be at most ${options.max} characters`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Validate array field with appropriate error messages
 * Requirements: 21.5
 */
export const validateArray = (fieldName: string, options?: {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName];

    if (!value) {
      if (options?.required) {
        return res.status(400).json({
          success: false,
          message: `${fieldName} is required`,
          timestamp: new Date().toISOString()
        });
      }
      return next();
    }

    if (!Array.isArray(value)) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} must be an array`,
        timestamp: new Date().toISOString()
      });
    }

    if (options?.minLength !== undefined && value.length < options.minLength) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} must contain at least ${options.minLength} items`,
        timestamp: new Date().toISOString()
      });
    }

    if (options?.maxLength !== undefined && value.length > options.maxLength) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} must contain at most ${options.maxLength} items`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};
