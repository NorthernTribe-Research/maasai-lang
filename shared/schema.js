import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex, jsonb, varchar, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";
// Sessions table for user authentication
export const sessions = pgTable("sessions", {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
}, (table) => [uniqueIndex("IDX_session_expire").on(table.expire)]);
// User table
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    email: varchar("email").unique(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    username: text("username").unique(),
    password: text("password"),
    xp: integer("xp").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    hearts: integer("hearts").notNull().default(5),
    maxHearts: integer("max_hearts").notNull().default(5),
    level: integer("level").notNull().default(1),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastActive: timestamp("last_active").notNull().defaultNow(),
    streakUpdatedAt: timestamp("streak_updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    isAdmin: boolean("is_admin").notNull().default(false),
}, (table) => ({
    xpIdx: index("users_xp_idx").on(table.xp.desc()),
    lastActiveIdx: index("users_last_active_idx").on(table.lastActive),
    xpStreakIdx: index("users_xp_streak_idx").on(table.xp.desc(), table.streak.desc()),
}));
// User Settings table
export const userSettings = pgTable("user_settings", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id).unique(),
    emailNotifications: boolean("email_notifications").notNull().default(true),
    pushNotifications: boolean("push_notifications").notNull().default(false),
    weeklyReport: boolean("weekly_report").notNull().default(true),
    achievementAlerts: boolean("achievement_alerts").notNull().default(true),
    streakReminders: boolean("streak_reminders").notNull().default(true),
    practiceReminders: boolean("practice_reminders").notNull().default(true),
    dataSharing: boolean("data_sharing").notNull().default(false),
    profileVisibility: text("profile_visibility").notNull().default("public"),
    showProgress: boolean("show_progress").notNull().default(true),
    showStreak: boolean("show_streak").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
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
}, (table) => ({
    userIdIdx: index("ai_sessions_user_id_idx").on(table.userId),
    createdAtIdx: index("ai_sessions_created_at_idx").on(table.createdAt),
}));
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
}, (table) => ({
    sessionIdIdx: index("conversations_session_id_idx").on(table.sessionId),
}));
// Legacy Tables
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
}, (table) => ({
    userIdIdx: index("user_lessons_user_id_idx").on(table.userId),
    completedAtIdx: index("user_lessons_completed_at_idx").on(table.completedAt),
}));
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
}, (table) => ({
    userIdIdx: index("user_achievements_user_id_idx").on(table.userId),
}));
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
}, (table) => ({
    userDateIdx: index("daily_challenges_user_date_idx").on(table.userId, table.date),
}));
// Learning Profiles table (enhanced user language tracking)
export const learningProfiles = pgTable("learning_profiles", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    targetLanguage: varchar("target_language", { length: 50 }).notNull(),
    nativeLanguage: varchar("native_language", { length: 50 }).notNull(),
    proficiencyLevel: varchar("proficiency_level", { length: 20 }).notNull().default('Beginner'),
    currentXP: integer("current_xp").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastActivityDate: timestamp("last_activity_date"),
    weaknesses: jsonb("weaknesses").default(sql `'[]'::jsonb`),
    strengths: jsonb("strengths").default(sql `'[]'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    userLanguageProfileIdx: uniqueIndex("user_language_profile_idx").on(table.userId, table.targetLanguage),
}));
// Curricula table
export const curricula = pgTable("curricula", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
    targetLanguage: varchar("target_language", { length: 50 }).notNull(),
    lessons: jsonb("lessons").notNull().default(sql `'[]'::jsonb`), // Array of lesson IDs
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    profileIdIdx: index("curricula_profile_id_idx").on(table.profileId),
}));
// Enhanced Lessons table with vocabulary, grammar, and cultural content
export const enhancedLessons = pgTable("enhanced_lessons", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    curriculumId: uuid("curriculum_id").notNull().references(() => curricula.id),
    title: varchar("title", { length: 255 }).notNull(),
    proficiencyLevel: varchar("proficiency_level", { length: 20 }).notNull(),
    orderIndex: integer("order_index").notNull(),
    vocabulary: jsonb("vocabulary").notNull().default(sql `'[]'::jsonb`),
    grammar: jsonb("grammar").notNull().default(sql `'[]'::jsonb`),
    culturalContent: jsonb("cultural_content").notNull().default(sql `'[]'::jsonb`),
    estimatedDuration: integer("estimated_duration").notNull().default(30), // minutes
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    curriculumIdIdx: index("enhanced_lessons_curriculum_id_idx").on(table.curriculumId),
    orderIdx: index("enhanced_lessons_order_idx").on(table.curriculumId, table.orderIndex),
}));
// Lesson Completions table
export const lessonCompletions = pgTable("lesson_completions", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    lessonId: uuid("lesson_id").notNull().references(() => enhancedLessons.id),
    profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
    performanceMetrics: jsonb("performance_metrics").notNull(),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    timeSpent: integer("time_spent").default(0), // seconds
}, (table) => ({
    profileIdIdx: index("lesson_completions_profile_id_idx").on(table.profileId),
    completedAtIdx: index("lesson_completions_completed_at_idx").on(table.completedAt),
    profileCompletedIdx: index("lesson_completions_profile_completed_idx").on(table.profileId, table.completedAt),
}));
// Exercises table
export const exercises = pgTable("exercises", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    type: varchar("type", { length: 50 }).notNull(), // translation, fill-in-blank, multiple-choice, matching
    question: text("question").notNull(),
    options: jsonb("options"), // for multiple choice
    correctAnswer: text("correct_answer").notNull(),
    explanation: text("explanation").notNull(),
    difficulty: integer("difficulty").notNull().default(5), // 1-10
    targetWeakness: varchar("target_weakness", { length: 100 }),
    targetLanguage: varchar("target_language", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
// Exercise Submissions table
export const exerciseSubmissions = pgTable("exercise_submissions", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
    profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
    userAnswer: text("user_answer").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    timeTaken: integer("time_taken").notNull(), // seconds
}, (table) => ({
    profileIdIdx: index("exercise_submissions_profile_id_idx").on(table.profileId),
    submittedAtIdx: index("exercise_submissions_submitted_at_idx").on(table.submittedAt),
    profileSubmittedIdx: index("exercise_submissions_profile_submitted_idx").on(table.profileId, table.submittedAt),
}));
// Voice Sessions table
export const voiceSessions = pgTable("voice_sessions", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
    conversationHistory: jsonb("conversation_history").notNull().default(sql `'[]'::jsonb`),
    totalTurns: integer("total_turns").notNull().default(0),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    duration: integer("duration").default(0), // seconds
}, (table) => ({
    profileIdIdx: index("voice_sessions_profile_id_idx").on(table.profileId),
    startedAtIdx: index("voice_sessions_started_at_idx").on(table.startedAt),
}));
// Pronunciation Analyses table
export const pronunciationAnalyses = pgTable("pronunciation_analyses", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
    score: integer("score").notNull(), // 0-100
    overallScore: integer("overall_score").notNull().default(0), // 0-100
    transcript: text("transcript").notNull(),
    targetText: text("target_text").notNull(),
    problematicPhonemes: jsonb("problematic_phonemes").notNull().default(sql `'[]'::jsonb`),
    overallFeedback: text("overall_feedback").notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
}, (table) => ({
    profileIdIdx: index("pronunciation_analyses_profile_id_idx").on(table.profileId),
    timestampIdx: index("pronunciation_analyses_timestamp_idx").on(table.timestamp),
    profileTimestampIdx: index("pronunciation_analyses_profile_timestamp_idx").on(table.profileId, table.timestamp),
}));
// XP Gains table
export const xpGains = pgTable("xp_gains", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    profileId: uuid("profile_id").references(() => learningProfiles.id),
    amount: integer("amount").notNull(),
    source: varchar("source", { length: 50 }).notNull(), // lesson, exercise, voice, pronunciation, challenge, streak_bonus
    sourceId: varchar("source_id", { length: 255 }),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => ({
    userTimestampIdx: index("xp_gains_user_timestamp_idx").on(table.userId, table.timestamp),
}));
// AI Session Contexts table
export const aiSessionContexts = pgTable("ai_session_contexts", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    sessionType: varchar("session_type", { length: 50 }).notNull(), // tutor, voice, general
    conversationHistory: jsonb("conversation_history").notNull().default(sql `'[]'::jsonb`),
    learningContext: jsonb("learning_context").notNull(),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
    userIdIdx: index("ai_session_contexts_user_id_idx").on(table.userId),
    expiresAtIdx: index("ai_session_contexts_expires_at_idx").on(table.expiresAt),
}));
// Activity Summaries table
export const activitySummaries = pgTable("activity_summaries", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
    date: timestamp("date").notNull(),
    activityType: varchar("activity_type", { length: 50 }).notNull(), // lesson, exercise, voice, pronunciation, tutor
    count: integer("count").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    averageAccuracy: integer("average_accuracy").notNull().default(0), // 0-100
}, (table) => ({
    profileDateIdx: uniqueIndex("activity_summaries_profile_date_idx").on(table.profileId, table.date, table.activityType),
}));
// Pronunciation Trends table
export const pronunciationTrends = pgTable("pronunciation_trends", {
    id: uuid("id").primaryKey().default(sql `gen_random_uuid()`),
    profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
    date: timestamp("date").notNull(),
    averageScore: integer("average_score").notNull(), // 0-100
    phonemeScores: jsonb("phoneme_scores").notNull().default(sql `'{}'::jsonb`),
    improvementRate: integer("improvement_rate").notNull().default(0), // percentage
}, (table) => ({
    profileDateIdx: uniqueIndex("pronunciation_trends_profile_date_idx").on(table.profileId, table.date),
}));
// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
    userLanguages: many(userLanguages),
    aiLearningSessions: many(aiLearningSessions),
    userLessons: many(userLessons),
    userAchievements: many(userAchievements),
    dailyChallenges: many(dailyChallenges),
    learningProfiles: many(learningProfiles),
    xpGains: many(xpGains),
    aiSessionContexts: many(aiSessionContexts),
    settings: one(userSettings, { fields: [users.id], references: [userSettings.userId] }),
}));
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));
export const learningProfilesRelations = relations(learningProfiles, ({ one, many }) => ({
    user: one(users, { fields: [learningProfiles.userId], references: [users.id] }),
    curricula: many(curricula),
    lessonCompletions: many(lessonCompletions),
    exerciseSubmissions: many(exerciseSubmissions),
    voiceSessions: many(voiceSessions),
    pronunciationAnalyses: many(pronunciationAnalyses),
    activitySummaries: many(activitySummaries),
    pronunciationTrends: many(pronunciationTrends),
}));
export const curriculaRelations = relations(curricula, ({ one, many }) => ({
    profile: one(learningProfiles, { fields: [curricula.profileId], references: [learningProfiles.id] }),
    lessons: many(enhancedLessons),
}));
export const enhancedLessonsRelations = relations(enhancedLessons, ({ one, many }) => ({
    curriculum: one(curricula, { fields: [enhancedLessons.curriculumId], references: [curricula.id] }),
    completions: many(lessonCompletions),
}));
export const lessonCompletionsRelations = relations(lessonCompletions, ({ one }) => ({
    lesson: one(enhancedLessons, { fields: [lessonCompletions.lessonId], references: [enhancedLessons.id] }),
    profile: one(learningProfiles, { fields: [lessonCompletions.profileId], references: [learningProfiles.id] }),
}));
export const exercisesRelations = relations(exercises, ({ many }) => ({
    submissions: many(exerciseSubmissions),
}));
export const exerciseSubmissionsRelations = relations(exerciseSubmissions, ({ one }) => ({
    exercise: one(exercises, { fields: [exerciseSubmissions.exerciseId], references: [exercises.id] }),
    profile: one(learningProfiles, { fields: [exerciseSubmissions.profileId], references: [learningProfiles.id] }),
}));
export const voiceSessionsRelations = relations(voiceSessions, ({ one }) => ({
    profile: one(learningProfiles, { fields: [voiceSessions.profileId], references: [learningProfiles.id] }),
}));
export const pronunciationAnalysesRelations = relations(pronunciationAnalyses, ({ one }) => ({
    profile: one(learningProfiles, { fields: [pronunciationAnalyses.profileId], references: [learningProfiles.id] }),
}));
export const xpGainsRelations = relations(xpGains, ({ one }) => ({
    user: one(users, { fields: [xpGains.userId], references: [users.id] }),
    profile: one(learningProfiles, { fields: [xpGains.profileId], references: [learningProfiles.id] }),
}));
export const aiSessionContextsRelations = relations(aiSessionContexts, ({ one }) => ({
    user: one(users, { fields: [aiSessionContexts.userId], references: [users.id] }),
}));
export const activitySummariesRelations = relations(activitySummaries, ({ one }) => ({
    profile: one(learningProfiles, { fields: [activitySummaries.profileId], references: [learningProfiles.id] }),
}));
export const pronunciationTrendsRelations = relations(pronunciationTrends, ({ one }) => ({
    profile: one(learningProfiles, { fields: [pronunciationTrends.profileId], references: [learningProfiles.id] }),
}));
export const aiLearningSessionsRelations = relations(aiLearningSessions, ({ one, many }) => ({
    user: one(users, { fields: [aiLearningSessions.userId], references: [users.id] }),
    language: one(languages, { fields: [aiLearningSessions.languageId], references: [languages.id] }),
    conversations: many(learningConversations),
}));
export const learningConversationsRelations = relations(learningConversations, ({ one }) => ({
    session: one(aiLearningSessions, { fields: [learningConversations.sessionId], references: [aiLearningSessions.id] }),
    user: one(users, { fields: [learningConversations.userId], references: [users.id] }),
}));
export const achievementsRelations = relations(achievements, ({ many }) => ({
    userAchievements: many(userAchievements),
}));
export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
    user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
    achievement: one(achievements, { fields: [userAchievements.achievementId], references: [achievements.id] }),
}));
export const challengesRelations = relations(challenges, ({ one, many }) => ({
    language: one(languages, { fields: [challenges.languageId], references: [languages.id] }),
    dailyChallenges: many(dailyChallenges),
}));
export const dailyChallengesRelations = relations(dailyChallenges, ({ one }) => ({
    user: one(users, { fields: [dailyChallenges.userId], references: [users.id] }),
    challenge: one(challenges, { fields: [dailyChallenges.challengeId], references: [challenges.id] }),
}));
export const lessonsRelations = relations(lessons, ({ one, many }) => ({
    language: one(languages, { fields: [lessons.languageId], references: [languages.id] }),
    userLessons: many(userLessons),
}));
export const userLessonsRelations = relations(userLessons, ({ one }) => ({
    user: one(users, { fields: [userLessons.userId], references: [users.id] }),
    lesson: one(lessons, { fields: [userLessons.lessonId], references: [lessons.id] }),
}));
export const languagesRelations = relations(languages, ({ many }) => ({
    userLanguages: many(userLanguages),
    lessons: many(lessons),
}));
export const userLanguagesRelations = relations(userLanguages, ({ one }) => ({
    user: one(users, { fields: [userLanguages.userId], references: [users.id] }),
    language: one(languages, { fields: [userLanguages.languageId], references: [languages.id] }),
}));
// Schemas & Types
export const insertUserSchema = createInsertSchema(users).omit({ id: true, xp: true, streak: true, lastActive: true, streakUpdatedAt: true, createdAt: true, updatedAt: true, isAdmin: true });
export const insertUserLanguageSchema = createInsertSchema(userLanguages);
export const insertLearningProfileSchema = createInsertSchema(learningProfiles);
export const insertCurriculumSchema = createInsertSchema(curricula);
export const insertEnhancedLessonSchema = createInsertSchema(enhancedLessons);
export const insertLessonCompletionSchema = createInsertSchema(lessonCompletions);
export const insertExerciseSchema = createInsertSchema(exercises);
export const insertExerciseSubmissionSchema = createInsertSchema(exerciseSubmissions);
export const insertVoiceSessionSchema = createInsertSchema(voiceSessions);
export const insertPronunciationAnalysisSchema = createInsertSchema(pronunciationAnalyses);
export const insertXPGainSchema = createInsertSchema(xpGains);
export const insertAISessionContextSchema = createInsertSchema(aiSessionContexts);
export const insertActivitySummarySchema = createInsertSchema(activitySummaries);
export const insertPronunciationTrendSchema = createInsertSchema(pronunciationTrends);
export const insertLessonSchema = createInsertSchema(lessons);
export const insertUserLessonSchema = createInsertSchema(userLessons);
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertUserAchievementSchema = createInsertSchema(userAchievements);
export const insertChallengeSchema = createInsertSchema(challenges);
export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges);
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export * from "./models/auth";
