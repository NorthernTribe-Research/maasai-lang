import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Configuration Manager
 * Centralized configuration management with secure credential handling
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

export type Environment = 'development' | 'staging' | 'production';

export interface ServerConfig {
  port: number;
  host: string;
  baseUrl: string;
  allowedOrigins: string[];
}

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  poolSize: number;
}

export interface AIConfig {
  gemini: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
}

export interface SecurityConfig {
  sessionSecret: string;
  jwtSecret: string;
  jwtExpiration: string;
  bcryptRounds: number;
  rateLimits: RateLimitConfig;
}

export interface RateLimitConfig {
  unauthenticated: { requests: number; window: number };
  authenticated: { requests: number; window: number };
  ai: { requests: number; window: number };
}

export interface MonitoringConfig {
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  logFormat: 'json' | 'text';
  sentryDsn?: string;
  metricsEnabled: boolean;
}

export interface AppConfig {
  environment: Environment;
  server: ServerConfig;
  database: DatabaseConfig;
  ai: AIConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

class ConfigurationManager {
  private config: AppConfig | null = null;
  private static instance: ConfigurationManager;

  private constructor() {}

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Load and validate configuration
   * Requirements: 1.1, 1.2
   */
  async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    const environment = this.getEnvironment();
    
    // Validate required environment variables
    this.validateRequiredVars();

    // Generate secure secrets if not provided
    const sessionSecret = this.getOrGenerateSecret('SESSION_SECRET');
    const jwtSecret = this.getOrGenerateSecret('JWT_SECRET');

    this.config = {
      environment,
      server: this.loadServerConfig(),
      database: this.loadDatabaseConfig(),
      ai: this.loadAIConfig(),
      security: this.loadSecurityConfig(sessionSecret, jwtSecret),
      monitoring: this.loadMonitoringConfig(),
    };

    logger.info('Configuration loaded successfully', {
      environment: this.config.environment,
      server: { port: this.config.server.port, host: this.config.server.host },
    });

    return this.config;
  }

  /**
   * Get configuration value with type safety
   */
  get<T>(key: string): T {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      value = value[k];
      if (value === undefined) {
        throw new Error(`Configuration key not found: ${key}`);
      }
    }

    return value as T;
  }

  /**
   * Get environment
   * Requirements: 1.4
   */
  private getEnvironment(): Environment {
    const env = process.env.NODE_ENV?.toLowerCase();
    if (env === 'production' || env === 'staging' || env === 'development') {
      return env;
    }
    return 'development';
  }

  /**
   * Validate required environment variables
   * Requirements: 1.2, 1.6
   */
  validateRequiredVars(): void {
    const required = ['DATABASE_URL'];
    const missing: string[] = [];

    for (const key of required) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }

    // Production-specific requirements
    if (this.getEnvironment() === 'production') {
      const productionRequired = ['GEMINI_API_KEY'];
      for (const key of productionRequired) {
        if (!process.env[key]) {
          missing.push(key);
        }
      }
    }

    if (missing.length > 0) {
      const message = `Missing required environment variables: ${missing.join(', ')}`;
      logger.error(message);
      throw new Error(message);
    }
  }

  /**
   * Generate cryptographically secure secret
   * Requirements: 1.3
   */
  generateSecret(bits: number = 256): string {
    const bytes = bits / 8;
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Get or generate secret
   * Requirements: 1.3
   */
  private getOrGenerateSecret(key: string): string {
    const existing = process.env[key];
    
    // Check for insecure default values
    const insecureDefaults = [
      'linguamaster_secret_key',
      'your_super_secret_session_key_here',
      'development-only-session-secret',
      'linguamaster_jwt_secret_key_change_in_production',
      'your_super_secret_jwt_secret_here',
      'development-only-jwt-secret-do-not-use-in-production',
    ];

    if (existing && !insecureDefaults.includes(existing)) {
      return existing;
    }

    // Generate secure secret
    const secret = this.generateSecret(256);
    
    if (this.getEnvironment() === 'production') {
      logger.warn(`${key} not set or using insecure default. Generated secure secret.`);
    } else {
      logger.info(`${key} not set. Generated secure secret for development.`);
    }

    return secret;
  }

  /**
   * Load server configuration
   */
  private loadServerConfig(): ServerConfig {
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.HOST || '0.0.0.0';
    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:5000', 'http://localhost:3000'];

    return { port, host, baseUrl, allowedOrigins };
  }

  /**
   * Load database configuration
   */
  private loadDatabaseConfig(): DatabaseConfig {
    const url = process.env.DATABASE_URL!;
    
    // Parse DATABASE_URL if needed
    let host = process.env.PGHOST || 'localhost';
    let port = parseInt(process.env.PGPORT || '5432', 10);
    let database = process.env.PGDATABASE || 'linguamaster';
    let user = process.env.PGUSER || 'postgres';
    let password = process.env.PGPASSWORD || '';

    // Try to parse from DATABASE_URL if individual vars not set
    if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
      try {
        const dbUrl = new URL(url);
        host = dbUrl.hostname;
        port = parseInt(dbUrl.port || '5432', 10);
        database = dbUrl.pathname.slice(1);
        user = dbUrl.username;
        password = dbUrl.password;
      } catch (e) {
        logger.warn('Failed to parse DATABASE_URL, using defaults');
      }
    }

    const ssl = this.getEnvironment() === 'production';
    const poolSize = parseInt(process.env.DB_POOL_SIZE || '10', 10);

    return { url, host, port, database, user, password, ssl, poolSize };
  }

  /**
   * Load AI configuration
   */
  private loadAIConfig(): AIConfig {
    return {
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048', 10),
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048', 10),
      },
    };
  }

  /**
   * Load security configuration
   */
  private loadSecurityConfig(sessionSecret: string, jwtSecret: string): SecurityConfig {
    return {
      sessionSecret,
      jwtSecret,
      jwtExpiration: process.env.JWT_EXPIRATION || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
      rateLimits: {
        unauthenticated: {
          requests: parseInt(process.env.RATE_LIMIT_UNAUTH || '100', 10),
          window: 15 * 60 * 1000, // 15 minutes
        },
        authenticated: {
          requests: parseInt(process.env.RATE_LIMIT_AUTH || '1000', 10),
          window: 15 * 60 * 1000, // 15 minutes
        },
        ai: {
          requests: parseInt(process.env.RATE_LIMIT_AI || '50', 10),
          window: 60 * 60 * 1000, // 1 hour
        },
      },
    };
  }

  /**
   * Load monitoring configuration
   */
  private loadMonitoringConfig(): MonitoringConfig {
    const logLevel = (process.env.LOG_LEVEL?.toUpperCase() || 'INFO') as MonitoringConfig['logLevel'];
    const logFormat = (process.env.LOG_FORMAT?.toLowerCase() || 'json') as 'json' | 'text';
    
    return {
      logLevel,
      logFormat,
      sentryDsn: process.env.SENTRY_DSN,
      metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    };
  }

  /**
   * Redact sensitive values for logging
   * Requirements: 1.5
   */
  redactSensitive(value: string): string {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /authorization/i,
      /bearer/i,
      /jwt/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(value)) {
        return '[REDACTED]';
      }
    }

    return value;
  }

  /**
   * Get environment-specific config
   * Requirements: 1.4
   */
  getEnvironmentConfig(): Partial<AppConfig> {
    const env = this.getEnvironment();

    switch (env) {
      case 'production':
        return {
          monitoring: {
            logLevel: 'INFO',
            logFormat: 'json',
            metricsEnabled: true,
          },
        };
      case 'staging':
        return {
          monitoring: {
            logLevel: 'INFO',
            logFormat: 'json',
            metricsEnabled: true,
          },
        };
      case 'development':
      default:
        return {
          monitoring: {
            logLevel: 'DEBUG',
            logFormat: 'text',
            metricsEnabled: false,
          },
        };
    }
  }
}

export const configManager = ConfigurationManager.getInstance();
