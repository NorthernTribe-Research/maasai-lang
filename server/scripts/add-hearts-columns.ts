import { db, connection } from "../db";
import { sql } from "drizzle-orm";

async function addHeartsColumns() {
  try {
    console.log("Adding hearts system columns to users table...");

    // Add columns if they don't exist
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS hearts INTEGER NOT NULL DEFAULT 5,
      ADD COLUMN IF NOT EXISTS max_hearts INTEGER NOT NULL DEFAULT 5,
      ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;
    `);

    // Create index for leaderboard queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS users_xp_streak_idx ON users(xp DESC, streak DESC);
    `);

    // Update existing users to have hearts
    await db.execute(sql`
      UPDATE users 
      SET hearts = 5, max_hearts = 5, level = 1, longest_streak = 0 
      WHERE hearts IS NULL;
    `);

    console.log("✓ Hearts system columns added successfully!");
  } catch (error) {
    console.error("Error adding hearts columns:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

addHeartsColumns();
