import { db } from "../db";
import { sql } from "drizzle-orm";

async function addUserSettingsTable() {
  console.log("Adding user_settings table...");

  try {
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

    console.log("✓ user_settings table created successfully");

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

    console.log("✓ user_consent_events table created successfully");
  } catch (error) {
    console.error("Error creating user_settings table:", error);
    throw error;
  }
}

addUserSettingsTable()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
