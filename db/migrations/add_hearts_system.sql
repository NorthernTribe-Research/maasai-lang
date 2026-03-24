-- Add hearts/lives system to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS hearts INTEGER NOT NULL DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_hearts INTEGER NOT NULL DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS users_xp_streak_idx ON users(xp DESC, streak DESC);

-- Update existing users to have hearts
UPDATE users SET hearts = 5, max_hearts = 5, level = 1, longest_streak = 0 
WHERE hearts IS NULL;
