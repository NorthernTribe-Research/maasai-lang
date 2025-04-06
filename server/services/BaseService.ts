import { db } from "../db";

/**
 * Base service class that all other services extend
 * Provides common functionality across services
 */
export class BaseService {
  protected db = db;
  protected serviceName: string;

  constructor() {
    // Extract service name from class name
    this.serviceName = this.constructor.name;
  }

  /**
   * Log messages with service name prefix
   * @param message Message to log
   * @param level Log level (default: 'log')
   */
  protected log(message: string, level: 'log' | 'error' | 'warn' | 'info' = 'log'): void {
    const prefix = `[${this.serviceName}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'info':
        console.info(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Handle and log errors in a consistent way
   * @param error Error object
   * @param context Additional context about where the error occurred
   * @returns The error for further handling
   */
  protected handleError(error: any, context: string): Error {
    const errorMessage = error.message || 'Unknown error';
    this.log(`Error in ${context}: ${errorMessage}`, 'error');
    
    // Log stack trace in development
    if (process.env.NODE_ENV !== 'production' && error.stack) {
      console.error(error.stack);
    }
    
    // Return the error for further handling
    return error instanceof Error 
      ? error 
      : new Error(`${context}: ${errorMessage}`);
  }
  
  /**
   * Convert date objects to ISO strings for consistent database storage
   * @param date Date object or ISO string
   * @returns ISO string representation of the date
   */
  protected formatDate(date: Date | string | null): string | null {
    if (!date) return null;
    
    if (typeof date === 'string') {
      // Check if it's already a valid ISO string
      if (isNaN(Date.parse(date))) {
        throw new Error(`Invalid date string: ${date}`);
      }
      return date;
    }
    
    return date.toISOString();
  }
}