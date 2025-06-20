import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100)
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(100),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100).optional()
});

export const aiRequestSchema = z.object({
  languageId: z.number().int().positive(),
  message: z.string().min(1).max(1000).optional(),
  topic: z.string().min(1).max(100).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  exerciseType: z.string().min(1).max(50).optional(),
  count: z.number().int().min(1).max(20).optional()
});