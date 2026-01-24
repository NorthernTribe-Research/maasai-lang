import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex, jsonb, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Replit Auth Sessions table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [uniqueIndex("IDX_session_expire").on(table.expire)]
);

// User table - Integrated with Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: text("username").unique(),
  password: text("password"),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastActive: timestamp("last_active").notNull().defaultNow(),
  streakUpdatedAt: timestamp("streak_updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

// Languages table
export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  flag: text("flag").notNull(),
  description: text("description"),
});

// UserLanguage
export const userLanguages = pgTable("user_languages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  level: integer("level").notNull().default(1),
  progress: integer("progress").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userLanguageIdx: uniqueIndex("user_language_idx").on(table.userId, table.languageId),
}));

// AI Learning Sessions
export const aiLearningSessions = pgTable("ai_learning_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  languageId: integer("language_id").notNull().references(() => languages.id),
  sessionType: text("session_type").notNull(), 
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull(), 
  aiTeacherPersona: text("ai_teacher_persona"),
  learningObjectives: jsonb("learning_objectives"),
  contentSummary: jsonb("content_summary"),
  performanceMetrics: jsonb("performance_metrics"),
  adaptations: jsonb("adaptations"),
  xpEarned: integer("xp_earned").notNull().default(0),
  duration: integer("duration"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Conversations
export const learningConversations = pgTable("learning_conversations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => aiLearningSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), 
  content: text("content").notNull(),
  aiAnalysis: jsonb("ai_analysis"),
  feedback: text("feedback"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Legacy Tables (Kept for compatibility)
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  languageId: integer("language_id").notNull().references(() => languages.id),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  level: integer("level").notNull().default(1),
  type: text("type").notNull(),
  xpReward: integer("xp_reward").notNull().default(10),
  order: integer("order").notNull(),
  duration: integer("duration").notNull().default(10),
  icon: text("icon"),
});

export const userLessons = pgTable("user_lessons", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id),
  isCompleted: boolean("is_completed").notNull().default(false),
  progress: integer("progress").notNull().default(0),
  lastAccessed: timestamp("last_accessed"),
  completedAt: timestamp("completed_at"),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  condition: text("condition").notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  languageId: integer("language_id").notNull().references(() => languages.id),
  prompt: text("prompt").notNull(),
  answer: text("answer").notNull(),
  type: text("type").notNull(),
  difficulty: integer("difficulty").notNull().default(1),
  xpReward: integer("xp_reward").notNull().default(10),
});

export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  date: timestamp("date").notNull().defaultNow(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userLanguages: many(userLanguages),
  aiLearningSessions: many(aiLearningSessions),
  userLessons: many(userLessons),
  userAchievements: many(userAchievements),
  dailyChallenges: many(dailyChallenges),
}));

export const aiLearningSessionsRelations = relations(aiLearningSessions, ({ one, many }) => ({
  user: one(users, { fields: [aiLearningSessions.userId], references: [users.id] }),
  conversations: many(learningConversations),
}));

export const lessonsRelations = relations(lessons, ({ many }) => ({
  userLessons: many(userLessons),
}));

export const userLessonsRelations = relations(userLessons, ({ one }) => ({
  user: one(users, { fields: [userLessons.userId], references: [users.id] }),
  lesson: one(lessons, { fields: [userLessons.lessonId], references: [lessons.id] }),
}));

// Schemas & Types
export const insertUserSchema = createInsertSchema(users).omit({ id: true, xp: true, streak: true, lastActive: true, streakUpdatedAt: true, createdAt: true, updatedAt: true, isAdmin: true });
export type User = typeof users.$inferSelect;
export type Language = typeof languages.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof createInsertSchema(lessons)>;
export type UserLesson = typeof userLessons.$inferSelect;
export type InsertUserLesson = z.infer<typeof createInsertSchema(userLessons)>;
export type AiLearningSession = typeof aiLearningSessions.$inferSelect;

export * from "./models/auth";
