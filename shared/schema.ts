import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  displayName: text("display_name"),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastActive: timestamp("last_active").notNull().defaultNow(),
  streakUpdatedAt: timestamp("streak_updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

// Define relations for users
export const usersRelations = relations(users, ({ many }) => ({
  userLanguages: many(userLanguages),
  userLessons: many(userLessons),
  userAchievements: many(userAchievements),
  dailyChallenges: many(dailyChallenges),
}));

// Languages table
export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  flag: text("flag").notNull(),
  description: text("description"),
});

// UserLanguage (junction table for users and their languages)
export const userLanguages = pgTable("user_languages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  level: integer("level").notNull().default(1),
  progress: integer("progress").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userLanguageIdx: uniqueIndex("user_language_idx").on(table.userId, table.languageId),
  };
});

// Lessons table
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  languageId: integer("language_id").notNull().references(() => languages.id),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  level: integer("level").notNull().default(1),
  type: text("type").notNull(), // e.g., vocabulary, grammar, conversation
  xpReward: integer("xp_reward").notNull().default(10),
  order: integer("order").notNull(),
  duration: integer("duration").notNull().default(10), // in minutes
  icon: text("icon"), // icon name/class
});

// UserLesson (tracks user progress in lessons)
export const userLessons = pgTable("user_lessons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id),
  isCompleted: boolean("is_completed").notNull().default(false),
  progress: integer("progress").notNull().default(0), // percentage
  lastAccessed: timestamp("last_accessed"),
  completedAt: timestamp("completed_at"),
}, (table) => {
  return {
    userLessonIdx: uniqueIndex("user_lesson_idx").on(table.userId, table.lessonId),
  };
});

// Achievements table
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  condition: text("condition").notNull(), // JSON string describing the conditions
});

// UserAchievement (junction table for users and their achievements)
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
}, (table) => {
  return {
    userAchievementIdx: uniqueIndex("user_achievement_idx").on(table.userId, table.achievementId),
  };
});

// Challenges table
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  languageId: integer("language_id").notNull().references(() => languages.id),
  prompt: text("prompt").notNull(),
  answer: text("answer").notNull(),
  type: text("type").notNull(), // translation, multiple-choice, fill-in-the-blank
  difficulty: integer("difficulty").notNull().default(1),
  xpReward: integer("xp_reward").notNull().default(10),
});

// DailyChallenge table
export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  date: timestamp("date").notNull().defaultNow(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
});

// AI-driven learning tables
// AI Learning Sessions - Dynamic AI-generated learning sessions
export const aiLearningSessions = pgTable("ai_learning_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  sessionType: text("session_type").notNull(), // conversation, lesson, assessment, practice
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  aiTeacherPersona: text("ai_teacher_persona"),
  learningObjectives: jsonb("learning_objectives"), // AI-determined objectives
  contentSummary: jsonb("content_summary"), // Summary of what was taught
  performanceMetrics: jsonb("performance_metrics"), // Detailed performance data
  adaptations: jsonb("adaptations"), // How AI adapted during session
  xpEarned: integer("xp_earned").notNull().default(0),
  duration: integer("duration"), // in seconds
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Learning Conversations - AI teacher conversation history
export const learningConversations = pgTable("learning_conversations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => aiLearningSessions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  aiAnalysis: jsonb("ai_analysis"), // AI's analysis of user's message (errors, strengths, etc.)
  feedback: text("feedback"), // Specific feedback given in response
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// User Learning Profiles - AI-enhanced learning profiles
export const userLearningProfiles = pgTable("user_learning_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  
  // Knowledge state tracked by AI
  skillLevels: jsonb("skill_levels"), // { vocabulary: 75, grammar: 68, speaking: 82, ... }
  masteredConcepts: jsonb("mastered_concepts").array(), // Array of mastered topics
  strugglingConcepts: jsonb("struggling_concepts").array(), // Topics needing work
  
  // Learning style preferences (AI-determined)
  learningStyle: jsonb("learning_style"), // { visual: 80, auditory: 60, kinesthetic: 40 }
  preferredPace: text("preferred_pace"), // slow, medium, fast
  preferredSessionLength: integer("preferred_session_length").default(30), // minutes
  
  // Performance metrics
  overallAccuracy: real("overall_accuracy").default(50),
  averageResponseTime: integer("average_response_time").default(5), // seconds
  retentionRate: real("retention_rate").default(50), // percentage
  engagementScore: real("engagement_score").default(50), // 0-100
  
  // Personalization data
  interests: jsonb("interests").array(), // Array of interest topics
  goals: jsonb("goals").array(), // Learning goals
  weaknesses: jsonb("weaknesses").array(), // Identified weak areas
  
  // AI recommendations
  nextRecommendedTopics: jsonb("next_recommended_topics").array(),
  suggestedFocus: text("suggested_focus"), // What AI recommends focusing on
  
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userProfileIdx: uniqueIndex("user_profile_idx").on(table.userId, table.languageId),
  };
});

// AI Performance Metrics - Detailed performance tracking for AI adaptation
export const aiPerformanceMetrics = pgTable("ai_performance_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => aiLearningSessions.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  
  // Interaction details
  concept: text("concept").notNull(), // What was being taught/practiced
  interactionType: text("interaction_type").notNull(), // question, exercise, conversation
  userResponse: text("user_response"),
  expectedResponse: text("expected_response"),
  isCorrect: boolean("is_correct"),
  accuracy: real("accuracy"), // 0-100
  responseTime: integer("response_time"), // milliseconds
  
  // AI analysis
  errorType: text("error_type"), // grammar, vocabulary, pronunciation, etc.
  difficultyLevel: text("difficulty_level"),
  aiConfidenceScore: real("ai_confidence_score"), // How confident AI is in its assessment
  
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// AI Generated Content Cache - Cache for AI-generated content to avoid regeneration
export const aiContentCache = pgTable("ai_content_cache", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // lesson, exercise, explanation, vocabulary
  languageId: integer("language_id").notNull().references(() => languages.id),
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull(),
  contentHash: text("content_hash").notNull().unique(), // Hash of parameters
  content: jsonb("content").notNull(), // The actual AI-generated content
  metadata: jsonb("metadata"), // Additional metadata
  usageCount: integer("usage_count").notNull().default(0),
  qualityScore: real("quality_score"), // User ratings/feedback
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  xp: true,
  streak: true,
  lastActive: true,
  streakUpdatedAt: true,
  createdAt: true,
  isAdmin: true,
});

export const insertLanguageSchema = createInsertSchema(languages).omit({
  id: true,
});

export const insertUserLanguageSchema = createInsertSchema(userLanguages).omit({
  id: true,
  level: true,
  progress: true,
  isActive: true,
  createdAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
});

export const insertUserLessonSchema = createInsertSchema(userLessons).omit({
  id: true,
  isCompleted: true,
  progress: true,
  lastAccessed: true,
  completedAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earnedAt: true,
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
});

export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({
  id: true,
  date: true,
  isCompleted: true,
  completedAt: true,
});

// AI tables insert schemas
export const insertAiLearningSessionSchema = createInsertSchema(aiLearningSessions).omit({
  id: true,
  xpEarned: true,
  isCompleted: true,
  createdAt: true,
  completedAt: true,
});

export const insertLearningConversationSchema = createInsertSchema(learningConversations).omit({
  id: true,
  timestamp: true,
});

export const insertUserLearningProfileSchema = createInsertSchema(userLearningProfiles).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

export const insertAiPerformanceMetricSchema = createInsertSchema(aiPerformanceMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertAiContentCacheSchema = createInsertSchema(aiContentCache).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  lastUsed: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLanguage = z.infer<typeof insertLanguageSchema>;
export type Language = typeof languages.$inferSelect;

export type InsertUserLanguage = z.infer<typeof insertUserLanguageSchema>;
export type UserLanguage = typeof userLanguages.$inferSelect;

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

export type InsertUserLesson = z.infer<typeof insertUserLessonSchema>;
export type UserLesson = typeof userLessons.$inferSelect;

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;

export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;

// AI tables types
export type InsertAiLearningSession = z.infer<typeof insertAiLearningSessionSchema>;
export type AiLearningSession = typeof aiLearningSessions.$inferSelect;

export type InsertLearningConversation = z.infer<typeof insertLearningConversationSchema>;
export type LearningConversation = typeof learningConversations.$inferSelect;

export type InsertUserLearningProfile = z.infer<typeof insertUserLearningProfileSchema>;
export type UserLearningProfile = typeof userLearningProfiles.$inferSelect;

export type InsertAiPerformanceMetric = z.infer<typeof insertAiPerformanceMetricSchema>;
export type AiPerformanceMetric = typeof aiPerformanceMetrics.$inferSelect;

export type InsertAiContentCache = z.infer<typeof insertAiContentCacheSchema>;
export type AiContentCache = typeof aiContentCache.$inferSelect;

// Authentication
export type LoginCredentials = Pick<InsertUser, "username" | "password">;

// Define all remaining relations
export const languagesRelations = relations(languages, ({ many }) => ({
  userLanguages: many(userLanguages),
  lessons: many(lessons),
  challenges: many(challenges),
}));

export const userLanguagesRelations = relations(userLanguages, ({ one }) => ({
  user: one(users, {
    fields: [userLanguages.userId],
    references: [users.id],
  }),
  language: one(languages, {
    fields: [userLanguages.languageId],
    references: [languages.id],
  }),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  language: one(languages, {
    fields: [lessons.languageId],
    references: [languages.id],
  }),
  userLessons: many(userLessons),
}));

export const userLessonsRelations = relations(userLessons, ({ one }) => ({
  user: one(users, {
    fields: [userLessons.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [userLessons.lessonId],
    references: [lessons.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  language: one(languages, {
    fields: [challenges.languageId],
    references: [languages.id],
  }),
  dailyChallenges: many(dailyChallenges),
}));

export const dailyChallengesRelations = relations(dailyChallenges, ({ one }) => ({
  user: one(users, {
    fields: [dailyChallenges.userId],
    references: [users.id],
  }),
  challenge: one(challenges, {
    fields: [dailyChallenges.challengeId],
    references: [challenges.id],
  }),
}));

// AI tables relations
export const aiLearningSessionsRelations = relations(aiLearningSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [aiLearningSessions.userId],
    references: [users.id],
  }),
  language: one(languages, {
    fields: [aiLearningSessions.languageId],
    references: [languages.id],
  }),
  conversations: many(learningConversations),
  performanceMetrics: many(aiPerformanceMetrics),
}));

export const learningConversationsRelations = relations(learningConversations, ({ one }) => ({
  session: one(aiLearningSessions, {
    fields: [learningConversations.sessionId],
    references: [aiLearningSessions.id],
  }),
  user: one(users, {
    fields: [learningConversations.userId],
    references: [users.id],
  }),
}));

export const userLearningProfilesRelations = relations(userLearningProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userLearningProfiles.userId],
    references: [users.id],
  }),
  language: one(languages, {
    fields: [userLearningProfiles.languageId],
    references: [languages.id],
  }),
}));

export const aiPerformanceMetricsRelations = relations(aiPerformanceMetrics, ({ one }) => ({
  user: one(users, {
    fields: [aiPerformanceMetrics.userId],
    references: [users.id],
  }),
  session: one(aiLearningSessions, {
    fields: [aiPerformanceMetrics.sessionId],
    references: [aiLearningSessions.id],
  }),
  language: one(languages, {
    fields: [aiPerformanceMetrics.languageId],
    references: [languages.id],
  }),
}));

export const aiContentCacheRelations = relations(aiContentCache, ({ one }) => ({
  language: one(languages, {
    fields: [aiContentCache.languageId],
    references: [languages.id],
  }),
}));
