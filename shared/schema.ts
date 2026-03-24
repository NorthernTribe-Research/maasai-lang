import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex, jsonb, varchar, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Sessions table for user authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [uniqueIndex("IDX_session_expire").on(table.expire)]
);

// User table
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
  hearts: integer("hearts").notNull().default(5),
  maxHearts: integer("max_hearts").notNull().default(5),
  gems: integer("gems").notNull().default(500),
  isPremium: boolean("is_premium").notNull().default(false),
  unlimitedHearts: boolean("unlimited_hearts").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
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
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  privacyAccepted: boolean("privacy_accepted").notNull().default(false),
  personalizationConsent: boolean("personalization_consent").notNull().default(false),
  analyticsConsent: boolean("analytics_consent").notNull().default(false),
  crashDiagnosticsConsent: boolean("crash_diagnostics_consent").notNull().default(true),
  microphonePermissionGranted: boolean("microphone_permission_granted").notNull().default(false),
  notificationsPermissionGranted: boolean("notifications_permission_granted").notNull().default(false),
  consentVersion: text("consent_version").notNull().default("2026.03"),
  consentUpdatedAt: timestamp("consent_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consent and permissions audit events
export const userConsentEvents = pgTable("user_consent_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull().default("consent_update"),
  changedKeys: jsonb("changed_keys").notNull().default(sql`'[]'::jsonb`),
  previousValues: jsonb("previous_values").notNull().default(sql`'{}'::jsonb`),
  newValues: jsonb("new_values").notNull().default(sql`'{}'::jsonb`),
  consentVersion: text("consent_version"),
  source: text("source").notNull().default("api"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userCreatedAtIdx: index("user_consent_events_user_created_at_idx").on(table.userId, table.createdAt),
  eventTypeIdx: index("user_consent_events_event_type_idx").on(table.eventType),
}));

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

export const userUnitLegendary = pgTable("user_unit_legendary", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  unitId: varchar("unit_id", { length: 64 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  upgradedAt: timestamp("upgraded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userUnitIdx: uniqueIndex("user_unit_legendary_user_unit_idx").on(table.userId, table.unitId),
  userIdx: index("user_unit_legendary_user_idx").on(table.userId),
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  targetLanguage: varchar("target_language", { length: 50 }).notNull(),
  nativeLanguage: varchar("native_language", { length: 50 }).notNull(),
  proficiencyLevel: varchar("proficiency_level", { length: 20 }).notNull().default('Beginner'),
  currentXP: integer("current_xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date"),
  weaknesses: jsonb("weaknesses").default(sql`'[]'::jsonb`),
  strengths: jsonb("strengths").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userLanguageProfileIdx: uniqueIndex("user_language_profile_idx").on(table.userId, table.targetLanguage),
}));

// Curricula table
export const curricula = pgTable("curricula", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
  targetLanguage: varchar("target_language", { length: 50 }).notNull(),
  lessons: jsonb("lessons").notNull().default(sql`'[]'::jsonb`), // Array of lesson IDs
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  profileIdIdx: index("curricula_profile_id_idx").on(table.profileId),
}));

// Enhanced Lessons table with vocabulary, grammar, and cultural content
export const enhancedLessons = pgTable("enhanced_lessons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  curriculumId: uuid("curriculum_id").notNull().references(() => curricula.id),
  title: varchar("title", { length: 255 }).notNull(),
  proficiencyLevel: varchar("proficiency_level", { length: 20 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  vocabulary: jsonb("vocabulary").notNull().default(sql`'[]'::jsonb`),
  grammar: jsonb("grammar").notNull().default(sql`'[]'::jsonb`),
  culturalContent: jsonb("cultural_content").notNull().default(sql`'[]'::jsonb`),
  estimatedDuration: integer("estimated_duration").notNull().default(30), // minutes
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  curriculumIdIdx: index("enhanced_lessons_curriculum_id_idx").on(table.curriculumId),
  orderIdx: index("enhanced_lessons_order_idx").on(table.curriculumId, table.orderIndex),
}));

// Lesson Completions table
export const lessonCompletions = pgTable("lesson_completions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  conversationHistory: jsonb("conversation_history").notNull().default(sql`'[]'::jsonb`),
  totalTurns: integer("total_turns").notNull().default(0),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  duration: integer("duration").default(0), // seconds
}, (table) => ({
  profileIdIdx: index("voice_sessions_profile_id_idx").on(table.profileId),
  startedAtIdx: index("voice_sessions_started_at_idx").on(table.startedAt),
}));

// Pronunciation Analyses table
export const pronunciationAnalyses = pgTable("pronunciation_analyses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
  score: integer("score").notNull(), // 0-100
  overallScore: integer("overall_score").notNull().default(0), // 0-100
  transcript: text("transcript").notNull(),
  targetText: text("target_text").notNull(),
  problematicPhonemes: jsonb("problematic_phonemes").notNull().default(sql`'[]'::jsonb`),
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionType: varchar("session_type", { length: 50 }).notNull(), // tutor, voice, general
  conversationHistory: jsonb("conversation_history").notNull().default(sql`'[]'::jsonb`),
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
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
  date: timestamp("date").notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // lesson, exercise, voice, pronunciation, tutor
  count: integer("count").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  averageAccuracy: integer("average_accuracy").notNull().default(0), // 0-100
}, (table) => ({
  profileDateIdx: uniqueIndex("activity_summaries_profile_date_idx").on(table.profileId, table.date, table.activityType),
}));

// Stripe checkout fulfillments for idempotent payment confirmation
export const stripeCheckoutFulfillments = pgTable("stripe_checkout_fulfillments", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  checkoutType: varchar("checkout_type", { length: 64 }).notNull(),
  packageId: varchar("package_id", { length: 32 }),
  plan: varchar("plan", { length: 32 }),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  fulfillmentPayload: jsonb("fulfillment_payload"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  fulfilledAt: timestamp("fulfilled_at"),
}, (table) => ({
  sessionIdx: uniqueIndex("stripe_checkout_fulfillments_session_idx").on(table.sessionId),
  userIdx: index("stripe_checkout_fulfillments_user_idx").on(table.userId),
  statusIdx: index("stripe_checkout_fulfillments_status_idx").on(table.status),
}));

// Pronunciation Trends table
export const pronunciationTrends = pgTable("pronunciation_trends", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: uuid("profile_id").notNull().references(() => learningProfiles.id),
  date: timestamp("date").notNull(),
  averageScore: integer("average_score").notNull(), // 0-100
  phonemeScores: jsonb("phoneme_scores").notNull().default(sql`'{}'::jsonb`),
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
  stripeCheckoutFulfillments: many(stripeCheckoutFulfillments),
  userConsentEvents: many(userConsentEvents),
  settings: one(userSettings, { fields: [users.id], references: [userSettings.userId] }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const userConsentEventsRelations = relations(userConsentEvents, ({ one }) => ({
  user: one(users, { fields: [userConsentEvents.userId], references: [users.id] }),
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

export const stripeCheckoutFulfillmentsRelations = relations(stripeCheckoutFulfillments, ({ one }) => ({
  user: one(users, { fields: [stripeCheckoutFulfillments.userId], references: [users.id] }),
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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  xp: true,
  streak: true,
  gems: true,
  lastActive: true,
  streakUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
  isAdmin: true,
  isPremium: true,
  unlimitedHearts: true,
  premiumExpiresAt: true,
});
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Language = typeof languages.$inferSelect;
export type UserLanguage = typeof userLanguages.$inferSelect;
export const insertUserLanguageSchema = createInsertSchema(userLanguages);
export type InsertUserLanguage = z.infer<typeof insertUserLanguageSchema>;

export type LearningProfile = typeof learningProfiles.$inferSelect;
export const insertLearningProfileSchema = createInsertSchema(learningProfiles);
export type InsertLearningProfile = z.infer<typeof insertLearningProfileSchema>;

export type Curriculum = typeof curricula.$inferSelect;
export const insertCurriculumSchema = createInsertSchema(curricula);
export type InsertCurriculum = z.infer<typeof insertCurriculumSchema>;

export type EnhancedLesson = typeof enhancedLessons.$inferSelect;
export const insertEnhancedLessonSchema = createInsertSchema(enhancedLessons);
export type InsertEnhancedLesson = z.infer<typeof insertEnhancedLessonSchema>;

export type LessonCompletion = typeof lessonCompletions.$inferSelect;
export const insertLessonCompletionSchema = createInsertSchema(lessonCompletions);
export type InsertLessonCompletion = z.infer<typeof insertLessonCompletionSchema>;

export type Exercise = typeof exercises.$inferSelect;
export const insertExerciseSchema = createInsertSchema(exercises);
export type InsertExercise = z.infer<typeof insertExerciseSchema>;

export type ExerciseSubmission = typeof exerciseSubmissions.$inferSelect;
export const insertExerciseSubmissionSchema = createInsertSchema(exerciseSubmissions);
export type InsertExerciseSubmission = z.infer<typeof insertExerciseSubmissionSchema>;

export type VoiceSession = typeof voiceSessions.$inferSelect;
export const insertVoiceSessionSchema = createInsertSchema(voiceSessions);
export type InsertVoiceSession = z.infer<typeof insertVoiceSessionSchema>;

export type PronunciationAnalysis = typeof pronunciationAnalyses.$inferSelect;
export const insertPronunciationAnalysisSchema = createInsertSchema(pronunciationAnalyses);
export type InsertPronunciationAnalysis = z.infer<typeof insertPronunciationAnalysisSchema>;

export type XPGain = typeof xpGains.$inferSelect;
export const insertXPGainSchema = createInsertSchema(xpGains);
export type InsertXPGain = z.infer<typeof insertXPGainSchema>;

export type AISessionContext = typeof aiSessionContexts.$inferSelect;
export const insertAISessionContextSchema = createInsertSchema(aiSessionContexts);
export type InsertAISessionContext = z.infer<typeof insertAISessionContextSchema>;

export type ActivitySummary = typeof activitySummaries.$inferSelect;
export const insertActivitySummarySchema = createInsertSchema(activitySummaries);
export type InsertActivitySummary = z.infer<typeof insertActivitySummarySchema>;

export type PronunciationTrend = typeof pronunciationTrends.$inferSelect;
export const insertPronunciationTrendSchema = createInsertSchema(pronunciationTrends);
export type InsertPronunciationTrend = z.infer<typeof insertPronunciationTrendSchema>;

// Legacy types
export type Lesson = typeof lessons.$inferSelect;
export const insertLessonSchema = createInsertSchema(lessons);
export type InsertLesson = z.infer<typeof insertLessonSchema>;

export type UserLesson = typeof userLessons.$inferSelect;
export const insertUserLessonSchema = createInsertSchema(userLessons);
export type InsertUserLesson = z.infer<typeof insertUserLessonSchema>;

export type UserUnitLegendary = typeof userUnitLegendary.$inferSelect;
export const insertUserUnitLegendarySchema = createInsertSchema(userUnitLegendary);
export type InsertUserUnitLegendary = z.infer<typeof insertUserUnitLegendarySchema>;

export type Achievement = typeof achievements.$inferSelect;
export const insertAchievementSchema = createInsertSchema(achievements);
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export const insertUserAchievementSchema = createInsertSchema(userAchievements);
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type Challenge = typeof challenges.$inferSelect;
export const insertChallengeSchema = createInsertSchema(challenges);
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;

export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges);
export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;

export type AiLearningSession = typeof aiLearningSessions.$inferSelect;

export type UserSettings = typeof userSettings.$inferSelect;
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type UserConsentEvent = typeof userConsentEvents.$inferSelect;
export const insertUserConsentEventSchema = createInsertSchema(userConsentEvents);
export type InsertUserConsentEvent = z.infer<typeof insertUserConsentEventSchema>;

export type StripeCheckoutFulfillment = typeof stripeCheckoutFulfillments.$inferSelect;
export const insertStripeCheckoutFulfillmentSchema = createInsertSchema(stripeCheckoutFulfillments);
export type InsertStripeCheckoutFulfillment = z.infer<typeof insertStripeCheckoutFulfillmentSchema>;

export * from "./models/auth";
