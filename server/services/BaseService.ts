import { db } from "../db";

/**
 * BaseService class that provides common database operations
 * for derived service classes.
 */
export class BaseService {
  protected db: typeof db;
  
  constructor() {
    this.db = db;
  }
  
  /**
   * Handles database errors and provides consistent error messages
   */
  protected handleError(error: any, context: string): never {
    console.error(`Error in ${context}:`, error);
    
    // Create a standardized error with context
    const enhancedError = new Error(
      `Operation failed in ${context}: ${error.message || 'Unknown error'}`
    );
    
    // Preserve original stack trace if available
    if (error.stack) {
      enhancedError.stack = error.stack;
    }
    
    throw enhancedError;
  }
}