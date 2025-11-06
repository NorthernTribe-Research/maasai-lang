/**
 * Base Service class with common functionality for all services
 */
export class BaseService {
  protected log(message: string, level: 'info' | 'error' | 'warn' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.constructor.name}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR:`, message);
        break;
      case 'warn':
        console.warn(`${prefix} WARN:`, message);
        break;
      default:
        console.log(`${prefix} INFO:`, message);
    }
  }

  protected handleError(error: unknown, context: string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.log(`Error ${context}: ${errorMessage}`, 'error');
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(`Failed ${context}: ${errorMessage}`);
  }

  protected formatJSON(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  }
}
