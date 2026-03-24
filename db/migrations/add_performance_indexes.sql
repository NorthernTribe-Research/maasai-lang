-- Migration: Add performance indexes for query optimization
-- Task: 22.3 Optimize database queries
-- Requirements: 23.3, 23.4, 23.6

-- Users table indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS users_xp_idx ON users (xp DESC);
CREATE INDEX IF NOT EXISTS users_last_active_idx ON users (last_active);

-- XP Gains table indexes for user activity tracking
-- Note: xp_gains_user_timestamp_idx already exists in schema

-- Lesson Completions indexes for progress tracking
CREATE INDEX IF NOT EXISTS lesson_completions_profile_id_idx ON lesson_completions (profile_id);
CREATE INDEX IF NOT EXISTS lesson_completions_completed_at_idx ON lesson_completions (completed_at);
CREATE INDEX IF NOT EXISTS lesson_completions_profile_completed_idx ON lesson_completions (profile_id, completed_at);

-- Exercise Submissions indexes for analytics
CREATE INDEX IF NOT EXISTS exercise_submissions_profile_id_idx ON exercise_submissions (profile_id);
CREATE INDEX IF NOT EXISTS exercise_submissions_submitted_at_idx ON exercise_submissions (submitted_at);
CREATE INDEX IF NOT EXISTS exercise_submissions_profile_submitted_idx ON exercise_submissions (profile_id, submitted_at);

-- Voice Sessions indexes for session tracking
CREATE INDEX IF NOT EXISTS voice_sessions_profile_id_idx ON voice_sessions (profile_id);
CREATE INDEX IF NOT EXISTS voice_sessions_started_at_idx ON voice_sessions (started_at);

-- Pronunciation Analyses indexes for trend analysis
CREATE INDEX IF NOT EXISTS pronunciation_analyses_profile_id_idx ON pronunciation_analyses (profile_id);
CREATE INDEX IF NOT EXISTS pronunciation_analyses_timestamp_idx ON pronunciation_analyses (timestamp);
CREATE INDEX IF NOT EXISTS pronunciation_analyses_profile_timestamp_idx ON pronunciation_analyses (profile_id, timestamp);

-- Enhanced Lessons indexes for curriculum queries
CREATE INDEX IF NOT EXISTS enhanced_lessons_curriculum_id_idx ON enhanced_lessons (curriculum_id);
CREATE INDEX IF NOT EXISTS enhanced_lessons_order_idx ON enhanced_lessons (curriculum_id, order_index);

-- Curricula indexes for profile lookups
CREATE INDEX IF NOT EXISTS curricula_profile_id_idx ON curricula (profile_id);

-- User Lessons indexes for legacy lesson tracking
CREATE INDEX IF NOT EXISTS user_lessons_user_id_idx ON user_lessons (user_id);
CREATE INDEX IF NOT EXISTS user_lessons_completed_at_idx ON user_lessons (completed_at);

-- User Achievements indexes for achievement queries
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements (user_id);

-- Daily Challenges indexes for challenge lookups
CREATE INDEX IF NOT EXISTS daily_challenges_user_date_idx ON daily_challenges (user_id, date);

-- AI Learning Sessions indexes for session queries
CREATE INDEX IF NOT EXISTS ai_sessions_user_id_idx ON ai_learning_sessions (user_id);
CREATE INDEX IF NOT EXISTS ai_sessions_created_at_idx ON ai_learning_sessions (created_at);

-- Learning Conversations indexes for session conversations
CREATE INDEX IF NOT EXISTS conversations_session_id_idx ON learning_conversations (session_id);

-- AI Session Contexts indexes for context management
CREATE INDEX IF NOT EXISTS ai_session_contexts_user_id_idx ON ai_session_contexts (user_id);
CREATE INDEX IF NOT EXISTS ai_session_contexts_expires_at_idx ON ai_session_contexts (expires_at);

-- Activity Summaries indexes (already has unique index on profile_id, date, activity_type)

-- Pronunciation Trends indexes (already has unique index on profile_id, date)

-- Add missing columns for optimization
ALTER TABLE voice_sessions ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;
ALTER TABLE lesson_completions ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;
ALTER TABLE exercise_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE pronunciation_analyses ADD COLUMN IF NOT EXISTS overall_score INTEGER DEFAULT 0;
ALTER TABLE pronunciation_analyses ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP DEFAULT NOW();

-- Update existing records to set analyzed_at from timestamp if null
UPDATE pronunciation_analyses SET analyzed_at = timestamp WHERE analyzed_at IS NULL;
UPDATE pronunciation_analyses SET overall_score = score WHERE overall_score = 0;
