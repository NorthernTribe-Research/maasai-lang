import { 
  User, InsertUser, Language, UserLanguage, InsertUserLanguage,
  Lesson, InsertLesson, UserLesson, InsertUserLesson, Achievement, InsertAchievement,
  UserAchievement, InsertUserAchievement, Challenge, InsertChallenge,
  DailyChallenge, InsertDailyChallenge,
  users, languages, userLanguages, lessons, userLessons, 
  achievements, userAchievements, challenges, dailyChallenges
} from "@shared/schema";
import { differenceInDays, startOfDay } from "date-fns";
import session from "express-session";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import connectPg from "connect-pg-simple";
import pg from "pg";

const PostgresSessionStore = connectPg(session);

const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStreak(userId: string): Promise<User>;
  getAllLanguages(): Promise<Language[]>;
  getLanguageByCode(code: string): Promise<Language | undefined>;
  addLanguage(language: any): Promise<Language>;
  getUserLanguages(userId: string): Promise<(UserLanguage & { language: Language })[]>;
  addUserLanguage(userLanguage: InsertUserLanguage): Promise<UserLanguage>;
  updateUserLanguageProgress(userId: string, languageId: number, progress: number): Promise<UserLanguage>;
  getLessonsByLanguage(languageId: number): Promise<Lesson[]>;
  getUserLessonsForLanguage(userId: string, languageId: number): Promise<(UserLesson & { lesson: Lesson })[]>;
  startUserLesson(userLesson: InsertUserLesson): Promise<UserLesson>;
  completeUserLesson(userId: string, lessonId: number, progress: number): Promise<UserLesson>;
  getAllAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]>;
  awardAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  getDailyChallenge(userId: string): Promise<(DailyChallenge & { challenge: Challenge }) | null>;
  completeDailyChallenge(userId: string, challengeId: number, isCorrect: boolean): Promise<{ success: boolean; xpEarned: number }>;
  getLeaderboard(): Promise<{ id: string; username: string | null; displayName: string | null; xp: number; languageId?: number; languageName?: string; }[]>;
  initializeData(): Promise<void>;
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: pgPool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserStreak(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastActive = new Date(user.lastActive);
    const daysSinceLastActive = differenceInDays(now, startOfDay(lastActive));

    let updatedFields: any = { lastActive: now };

    if (daysSinceLastActive === 1) {
      updatedFields.streak = user.streak + 1;
      updatedFields.streakUpdatedAt = now;
    } else if (daysSinceLastActive > 1) {
      updatedFields.streak = 1;
      updatedFields.streakUpdatedAt = now;
    }

    const [updatedUser] = await db.update(users)
      .set(updatedFields)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getAllLanguages(): Promise<Language[]> {
    return await db.select().from(languages);
  }

  async getLanguageByCode(code: string): Promise<Language | undefined> {
    const [language] = await db.select().from(languages).where(eq(languages.code, code));
    return language;
  }

  async addLanguage(language: any): Promise<Language> {
    const [newLanguage] = await db.insert(languages).values(language).returning();
    return newLanguage;
  }

  async getUserLanguages(userId: string): Promise<(UserLanguage & { language: Language })[]> {
    const results = await db
      .select({
        userLanguage: userLanguages,
        language: languages,
      })
      .from(userLanguages)
      .where(eq(userLanguages.userId, userId))
      .innerJoin(languages, eq(userLanguages.languageId, languages.id));

    return results.map(r => ({ ...r.userLanguage, language: r.language }));
  }

  async addUserLanguage(userLanguage: InsertUserLanguage): Promise<UserLanguage> {
    const [newUserLanguage] = await db.insert(userLanguages).values(userLanguage).returning();
    return newUserLanguage;
  }

  async updateUserLanguageProgress(userId: string, languageId: number, progress: number): Promise<UserLanguage> {
    const [userLanguage] = await db
      .select()
      .from(userLanguages)
      .where(and(eq(userLanguages.userId, userId), eq(userLanguages.languageId, languageId)));

    if (!userLanguage) throw new Error("User language not found");

    let newLevel = userLanguage.level;
    if (progress >= 100) {
      newLevel += 1;
      progress = 0;
    }

    const [updated] = await db
      .update(userLanguages)
      .set({ progress, level: newLevel })
      .where(eq(userLanguages.id, userLanguage.id))
      .returning();
    return updated;
  }

  async getLessonsByLanguage(languageId: number): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(eq(lessons.languageId, languageId))
      .orderBy(lessons.level, lessons.order);
  }

  async getUserLessonsForLanguage(userId: string, languageId: number): Promise<(UserLesson & { lesson: Lesson })[]> {
    const allLessons = await this.getLessonsByLanguage(languageId);
    const completedLessonsResults = await db
      .select({
        userLesson: userLessons,
        lesson: lessons,
      })
      .from(userLessons)
      .where(eq(userLessons.userId, userId))
      .innerJoin(lessons, eq(userLessons.lessonId, lessons.id));

    return allLessons.map(lesson => {
      const userLessonData = completedLessonsResults.find(cl => cl.lesson.id === lesson.id);
      if (userLessonData) {
        return { ...userLessonData.userLesson, lesson: userLessonData.lesson };
      }
      return {
        id: 0,
        userId,
        lessonId: lesson.id,
        isCompleted: false,
        progress: 0,
        lastAccessed: null,
        completedAt: null,
        lesson,
      } as (UserLesson & { lesson: Lesson });
    });
  }

  async startUserLesson(userLesson: InsertUserLesson): Promise<UserLesson> {
    const [existing] = await db
      .select()
      .from(userLessons)
      .where(and(eq(userLessons.userId, userLesson.userId), eq(userLessons.lessonId, userLesson.lessonId)));

    if (existing) {
      const [updated] = await db
        .update(userLessons)
        .set({ lastAccessed: new Date() })
        .where(eq(userLessons.id, existing.id))
        .returning();
      return updated;
    }

    const [newUserLesson] = await db.insert(userLessons).values(userLesson).returning();
    return newUserLesson;
  }

  async completeUserLesson(userId: string, lessonId: number, progress: number): Promise<UserLesson> {
    const [existing] = await db
      .select()
      .from(userLessons)
      .where(and(eq(userLessons.userId, userId), eq(userLessons.lessonId, lessonId)));

    const now = new Date();
    const isCompleted = progress >= 100;

    if (existing) {
      const [updated] = await db
        .update(userLessons)
        .set({
          progress,
          isCompleted: isCompleted || existing.isCompleted,
          lastAccessed: now,
          completedAt: isCompleted && !existing.isCompleted ? now : existing.completedAt,
        })
        .where(eq(userLessons.id, existing.id))
        .returning();
      return updated;
    }

    const [newUL] = await db
      .insert(userLessons)
      .values({
        userId,
        lessonId,
        progress,
        isCompleted,
        lastAccessed: now,
        completedAt: isCompleted ? now : null,
      })
      .returning();
    return newUL;
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }

  async getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
    const results = await db
      .select({
        ua: userAchievements,
        a: achievements,
      })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id));

    return results.map(r => ({ ...r.ua, achievement: r.a }));
  }

  async awardAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const [newUA] = await db.insert(userAchievements).values(userAchievement).returning();
    return newUA;
  }

  async getDailyChallenge(userId: string): Promise<(DailyChallenge & { challenge: Challenge }) | null> {
    const [dcData] = await db
      .select({
        dc: dailyChallenges,
        c: challenges,
      })
      .from(dailyChallenges)
      .where(and(eq(dailyChallenges.userId, userId), sql`DATE(${dailyChallenges.date}) = CURRENT_DATE`))
      .innerJoin(challenges, eq(dailyChallenges.challengeId, challenges.id));

    if (!dcData) return null;
    return { ...dcData.dc, challenge: dcData.c };
  }

  async completeDailyChallenge(userId: string, challengeId: number, isCorrect: boolean): Promise<{ success: boolean; xpEarned: number }> {
    const [dc] = await db
      .select()
      .from(dailyChallenges)
      .where(and(eq(dailyChallenges.userId, userId), eq(dailyChallenges.challengeId, challengeId)));

    if (!dc || dc.isCompleted) return { success: false, xpEarned: 0 };

    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId));
    const xpEarned = isCorrect ? challenge.xpReward : 0;

    await db
      .update(dailyChallenges)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(eq(dailyChallenges.id, dc.id));

    if (isCorrect) {
      await db.execute(sql`UPDATE users SET xp = xp + ${xpEarned} WHERE id = ${userId}`);
    }

    return { success: true, xpEarned };
  }

  async getLeaderboard(): Promise<{ id: string; username: string | null; displayName: string | null; xp: number; languageId?: number; languageName?: string; }[]> {
    const topUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.xp))
      .limit(10);

    return topUsers.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.username,
      xp: u.xp,
    }));
  }

  async initializeData(): Promise<void> {
    const langs = await this.getAllLanguages();
    if (langs.length === 0) {
      await db.insert(languages).values([
        { code: "zh", name: "Mandarin Chinese", flag: "🇨🇳", description: "The world's most spoken language" },
        { code: "es", name: "Spanish", flag: "🇪🇸", description: "Vibrant and widely spoken" },
        { code: "en", name: "English", flag: "🇺🇸", description: "The global language of business" },
        { code: "hi", name: "Hindi", flag: "🇮🇳", description: "The beautiful language of India" },
        { code: "ar", name: "Arabic", flag: "🇸🇦", description: "The rich language of the Arab world" },
      ]);
    }
  }
}

export const storage = new DatabaseStorage();
