import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function runStartupMigrations() {
  try {
    logger.info("Running startup migrations...");

    // Add hearts system columns
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS hearts INTEGER NOT NULL DEFAULT 5,
      ADD COLUMN IF NOT EXISTS max_hearts INTEGER NOT NULL DEFAULT 5,
      ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 500,
      ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS unlimited_hearts BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_unit_legendary (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        unit_id VARCHAR(64) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        upgraded_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS user_unit_legendary_user_unit_idx
      ON user_unit_legendary(user_id, unit_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_unit_legendary_user_idx
      ON user_unit_legendary(user_id);
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
        email_notifications BOOLEAN NOT NULL DEFAULT true,
        push_notifications BOOLEAN NOT NULL DEFAULT false,
        weekly_report BOOLEAN NOT NULL DEFAULT true,
        achievement_alerts BOOLEAN NOT NULL DEFAULT true,
        streak_reminders BOOLEAN NOT NULL DEFAULT true,
        practice_reminders BOOLEAN NOT NULL DEFAULT true,
        data_sharing BOOLEAN NOT NULL DEFAULT false,
        profile_visibility TEXT NOT NULL DEFAULT 'public',
        show_progress BOOLEAN NOT NULL DEFAULT true,
        show_streak BOOLEAN NOT NULL DEFAULT true,
        terms_accepted BOOLEAN NOT NULL DEFAULT false,
        privacy_accepted BOOLEAN NOT NULL DEFAULT false,
        personalization_consent BOOLEAN NOT NULL DEFAULT false,
        analytics_consent BOOLEAN NOT NULL DEFAULT false,
        crash_diagnostics_consent BOOLEAN NOT NULL DEFAULT true,
        microphone_permission_granted BOOLEAN NOT NULL DEFAULT false,
        notifications_permission_granted BOOLEAN NOT NULL DEFAULT false,
        consent_version TEXT NOT NULL DEFAULT '2026.03',
        consent_updated_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      ALTER TABLE user_settings
      ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS personalization_consent BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS analytics_consent BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS crash_diagnostics_consent BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS microphone_permission_granted BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS notifications_permission_granted BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS consent_version TEXT NOT NULL DEFAULT '2026.03',
      ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMP DEFAULT NOW();
    `);

    await db.execute(sql`
      ALTER TABLE user_settings
      ALTER COLUMN consent_updated_at DROP DEFAULT;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_consent_events (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        event_type TEXT NOT NULL DEFAULT 'consent_update',
        changed_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
        previous_values JSONB NOT NULL DEFAULT '{}'::jsonb,
        new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
        consent_version TEXT,
        source TEXT NOT NULL DEFAULT 'api',
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_consent_events_user_created_at_idx
      ON user_consent_events(user_id, created_at);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_consent_events_event_type_idx
      ON user_consent_events(event_type);
    `);

    // Stripe checkout fulfillments table for idempotent payment confirmation
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stripe_checkout_fulfillments (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        checkout_type VARCHAR(64) NOT NULL,
        package_id VARCHAR(32),
        plan VARCHAR(32),
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        fulfillment_payload JSONB,
        last_error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        fulfilled_at TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS stripe_checkout_fulfillments_session_idx
      ON stripe_checkout_fulfillments(session_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS stripe_checkout_fulfillments_user_idx
      ON stripe_checkout_fulfillments(user_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS stripe_checkout_fulfillments_status_idx
      ON stripe_checkout_fulfillments(status);
    `);

    // Create index for leaderboard queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS users_xp_streak_idx ON users(xp DESC, streak DESC);
    `);

    // Update existing users to have hearts (only if they don't have them)
    await db.execute(sql`
      UPDATE users 
      SET hearts = 5, max_hearts = 5, gems = 500, level = 1, longest_streak = 0, is_premium = FALSE, unlimited_hearts = FALSE
      WHERE hearts IS NULL;
    `);

    logger.info("✓ Startup migrations completed successfully");
  } catch (error) {
    logger.error("Startup migration error:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}
