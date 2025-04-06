import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
