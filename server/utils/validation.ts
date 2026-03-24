/**
 * Validation utilities for user input
 * Requirements: 21.5, 25.4
 */

/**
 * Validate email format
 * Requirements: 1.2
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: 25.1
 */
export function isValidPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 30) {
    errors.push('Username must be at most 30 characters long');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, hyphens, and underscores');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize user input to prevent injection attacks
 * Requirements: 25.4
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 1000); // Limit length
}

/**
 * Validate registration data
 * Requirements: 1.2, 25.1
 */
export function validateRegistrationData(data: {
  username: string;
  email?: string;
  password: string;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate username
  const usernameValidation = isValidUsername(data.username);
  if (!usernameValidation.valid) {
    errors.push(...usernameValidation.errors);
  }

  // Validate email if provided
  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  // Validate password
  const passwordValidation = isValidPassword(data.password);
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
