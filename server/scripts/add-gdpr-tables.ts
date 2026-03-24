/**
 * Migration: Add GDPR Compliance Tables
 * 
 * Creates tables for:
 * - Deletion requests (right to be forgotten)
 * - Audit log (compliance tracking)
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addGDPRTables() {
  console.log('Creating GDPR compliance tables...');

  try {
    // Create deletion_requests table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS deletion_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        scheduled_deletion_at TIMESTAMP NOT NULL,
        cancelled_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✓ Created deletion_requests table');

    // Create audit_log table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✓ Created audit_log table');

    // Create indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id 
      ON deletion_requests(user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_deletion_requests_status 
      ON deletion_requests(status)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled 
      ON deletion_requests(scheduled_deletion_at)
      WHERE status = 'pending'
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_log_user_id 
      ON audit_log(user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_log_action 
      ON audit_log(action)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
      ON audit_log(created_at DESC)
    `);

    console.log('✓ Created indexes');

    // Add check constraint for deletion request status
    await db.execute(sql`
      ALTER TABLE deletion_requests
      ADD CONSTRAINT check_deletion_status
      CHECK (status IN ('pending', 'cancelled', 'completed'))
    `);

    console.log('✓ Added constraints');

    console.log('\n✅ GDPR compliance tables created successfully!');
    console.log('\nTables created:');
    console.log('  - deletion_requests: Tracks user deletion requests');
    console.log('  - audit_log: Logs all GDPR-related actions for compliance');
    console.log('\nNext steps:');
    console.log('  1. Set up cron job to call /api/gdpr/execute-deletions daily');
    console.log('  2. Configure ADMIN_API_KEY environment variable');
    console.log('  3. Test data export and deletion workflows');

  } catch (error) {
    console.error('❌ Failed to create GDPR tables:', error);
    throw error;
  }
}

// Run migration
addGDPRTables()
  .then(() => {
    console.log('\nMigration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
