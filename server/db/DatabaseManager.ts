/**
 * Database Manager
 * 
 * Handles database migrations, backups, and monitoring for production readiness.
 * Provides utilities for safe schema changes with automatic rollback on failure.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Migration {
  version: string;
  name: string;
  timestamp: Date;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export interface MigrationResult {
  success: boolean;
  version: string;
  duration: number;
  error?: string;
}

export interface BackupResult {
  id: string;
  timestamp: string;
  size: number;
  location: string;
  checksum: string;
}

export interface PoolStatus {
  total: number;
  active: number;
  idle: number;
  waiting: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: string;
  parameters?: any[];
}

export class DatabaseManager {
  private migrationsTable = 'schema_migrations';
  private slowQueryThreshold = 1000; // 1 second in milliseconds

  /**
   * Initialize migrations table if it doesn't exist
   */
  async initializeMigrationsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(this.migrationsTable)} (
          version VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time_ms INTEGER,
          success BOOLEAN DEFAULT TRUE
        )
      `);
      logger.info('Migrations table initialized');
    } catch (error) {
      logger.error('Failed to initialize migrations table', error as Error);
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await db.execute(sql`
        SELECT version FROM ${sql.identifier(this.migrationsTable)}
        WHERE success = TRUE
        ORDER BY version ASC
      `);
      return result.rows.map((row: any) => row.version);
    } catch (error) {
      logger.error('Failed to get executed migrations', error as Error);
      return [];
    }
  }

  /**
   * Record migration execution
   */
  private async recordMigration(
    version: string,
    name: string,
    executionTimeMs: number,
    success: boolean
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO ${sql.identifier(this.migrationsTable)} 
        (version, name, execution_time_ms, success)
        VALUES (${version}, ${name}, ${executionTimeMs}, ${success})
      `);
    } catch (error) {
      logger.error('Failed to record migration', error as Error, {
        version,
        name,
        success,
      });
    }
  }

  /**
   * Run a migration with automatic backup and rollback on failure
   */
  async runMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();
    let backupId: string | null = null;

    logger.info('Starting migration', {
      version: migration.version,
      name: migration.name,
    });

    try {
      // Check if migration already executed
      const executed = await this.getExecutedMigrations();
      if (executed.includes(migration.version)) {
        logger.warn('Migration already executed', {
          version: migration.version,
        });
        return {
          success: true,
          version: migration.version,
          duration: 0,
          error: 'Already executed',
        };
      }

      // Create backup before migration
      logger.info('Creating backup before migration');
      const backup = await this.createBackup();
      backupId = backup.id;

      // Execute migration in a transaction
      await db.transaction(async (tx) => {
        await migration.up();
      });

      const duration = Date.now() - startTime;

      // Record successful migration
      await this.recordMigration(migration.version, migration.name, duration, true);

      logger.info('Migration completed successfully', {
        version: migration.version,
        duration,
      });

      return {
        success: true,
        version: migration.version,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Migration failed', error as Error, {
        version: migration.version,
        name: migration.name,
        duration,
      });

      // Record failed migration
      await this.recordMigration(migration.version, migration.name, duration, false);

      // Attempt rollback
      try {
        logger.info('Attempting automatic rollback');
        await migration.down();
        logger.info('Rollback successful');
      } catch (rollbackError) {
        logger.error('Rollback failed', rollbackError as Error, {
          version: migration.version,
        });
      }

      return {
        success: false,
        version: migration.version,
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Rollback a specific migration
   */
  async rollbackMigration(migration: Migration): Promise<void> {
    logger.info('Rolling back migration', {
      version: migration.version,
      name: migration.name,
    });

    try {
      await db.transaction(async (tx) => {
        await migration.down();
      });

      // Remove from migrations table
      await db.execute(sql`
        DELETE FROM ${sql.identifier(this.migrationsTable)}
        WHERE version = ${migration.version}
      `);

      logger.info('Migration rolled back successfully', {
        version: migration.version,
      });
    } catch (error) {
      logger.error('Migration rollback failed', error as Error, {
        version: migration.version,
      });
      throw error;
    }
  }

  /**
   * Create database backup
   * Note: This is a simplified version. In production, use Cloud SQL automated backups.
   */
  async createBackup(): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;
    const backupDir = process.env.BACKUP_DIR || '/tmp/backups';
    const backupPath = path.join(backupDir, `${backupId}.sql`);

    logger.info('Creating database backup', { backupId, backupPath });

    try {
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Get database connection details from DATABASE_URL
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      // Parse database URL
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // Create pg_dump command
      const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F c -f ${backupPath}`;

      // Execute backup
      await execAsync(command);

      // Get file size
      const stats = fs.statSync(backupPath);
      const size = stats.size;

      // Calculate checksum (simplified - use proper checksum in production)
      const checksum = `sha256-${Date.now()}`;

      logger.info('Backup created successfully', {
        backupId,
        size,
        location: backupPath,
      });

      return {
        id: backupId,
        timestamp,
        size,
        location: backupPath,
        checksum,
      };
    } catch (error) {
      logger.error('Backup creation failed', error as Error, { backupId });
      throw error;
    }
  }

  /**
   * Restore database from backup
   * Note: This is a simplified version. In production, use Cloud SQL restore procedures.
   */
  async restoreBackup(backupId: string): Promise<void> {
    const backupDir = process.env.BACKUP_DIR || '/tmp/backups';
    const backupPath = path.join(backupDir, `${backupId}.sql`);

    logger.info('Restoring database from backup', { backupId, backupPath });

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Get database connection details
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // Create pg_restore command
      const command = `PGPASSWORD="${password}" pg_restore -h ${host} -p ${port} -U ${username} -d ${database} -c ${backupPath}`;

      // Execute restore
      await execAsync(command);

      logger.info('Backup restored successfully', { backupId });
    } catch (error) {
      logger.error('Backup restore failed', error as Error, { backupId });
      throw error;
    }
  }

  /**
   * Get connection pool status
   * Note: This is a simplified version. Actual implementation depends on the connection pool library.
   */
  async getPoolStatus(): Promise<PoolStatus> {
    // This would need to be implemented based on your actual connection pool
    // For now, return mock data
    return {
      total: 10,
      active: 3,
      idle: 7,
      waiting: 0,
    };
  }

  /**
   * Get slow queries exceeding threshold
   */
  async getSlowQueries(thresholdMs?: number): Promise<SlowQuery[]> {
    const threshold = thresholdMs || this.slowQueryThreshold;

    try {
      // Query PostgreSQL's pg_stat_statements for slow queries
      // Note: Requires pg_stat_statements extension to be enabled
      const result = await db.execute(sql`
        SELECT 
          query,
          mean_exec_time as duration,
          calls,
          total_exec_time
        FROM pg_stat_statements
        WHERE mean_exec_time > ${threshold}
        ORDER BY mean_exec_time DESC
        LIMIT 50
      `);

      return result.rows.map((row: any) => ({
        query: row.query,
        duration: row.duration,
        timestamp: new Date().toISOString(),
        parameters: [],
      }));
    } catch (error) {
      logger.error('Failed to get slow queries', error as Error);
      return [];
    }
  }

  /**
   * Enable pg_stat_statements extension for query monitoring
   */
  async enableQueryMonitoring(): Promise<void> {
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`);
      logger.info('Query monitoring enabled (pg_stat_statements)');
    } catch (error) {
      logger.error('Failed to enable query monitoring', error as Error);
      throw error;
    }
  }

  /**
   * Get database size and growth metrics
   */
  async getDatabaseMetrics(): Promise<{
    size: number;
    tableCount: number;
    indexCount: number;
  }> {
    try {
      // Get database size
      const sizeResult = await db.execute(sql`
        SELECT pg_database_size(current_database()) as size
      `);
      const size = sizeResult.rows[0]?.size || 0;

      // Get table count
      const tableResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      const tableCount = tableResult.rows[0]?.count || 0;

      // Get index count
      const indexResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);
      const indexCount = indexResult.rows[0]?.count || 0;

      return {
        size: Number(size),
        tableCount: Number(tableCount),
        indexCount: Number(indexCount),
      };
    } catch (error) {
      logger.error('Failed to get database metrics', error as Error);
      throw error;
    }
  }

  /**
   * Verify database connectivity
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      logger.error('Database connection verification failed', error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();
