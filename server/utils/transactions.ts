import { db, connection } from '../db';
import { BaseService } from '../services/BaseService';

/**
 * Transaction utility for database operations
 * Requirements: 19.4, 19.6
 * 
 * Provides transaction wrappers and retry logic for database operations
 * that modify multiple related records.
 */

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  exponentialBackoff: true
};

/**
 * Execute a database operation with transaction support
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
  operation: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await operation(tx as unknown as typeof db);
  });
}

/**
 * Execute a database operation with retry logic
 * Retries failed operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff if enabled
      const delay = opts.exponentialBackoff
        ? opts.retryDelay * Math.pow(2, attempt)
        : opts.retryDelay;

      console.error(
        `Database operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  console.error(
    `Database operation failed after ${opts.maxRetries + 1} attempts: ${lastError?.message}`
  );
  throw lastError;
}

/**
 * Execute a database operation with both transaction and retry support
 * Combines transaction safety with retry logic for maximum reliability
 */
export async function withTransactionAndRetry<T>(
  operation: (tx: typeof db) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return await withRetry(
    () => withTransaction(operation),
    options
  );
}

/**
 * Helper to check if an error is retryable
 * Some errors (like constraint violations) shouldn't be retried
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Don't retry constraint violations, unique violations, etc.
  const nonRetryablePatterns = [
    'unique constraint',
    'foreign key constraint',
    'check constraint',
    'not null constraint',
    'duplicate key'
  ];

  return !nonRetryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * Execute with smart retry - only retries if error is retryable
 */
export async function withSmartRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        console.error(`Non-retryable error encountered: ${lastError.message}`);
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      const delay = opts.exponentialBackoff
        ? opts.retryDelay * Math.pow(2, attempt)
        : opts.retryDelay;

      console.error(
        `Database operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(
    `Database operation failed after ${opts.maxRetries + 1} attempts: ${lastError?.message}`
  );
  throw lastError;
}
