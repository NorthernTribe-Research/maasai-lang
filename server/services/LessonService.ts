import { BaseService } from "./BaseService";
import { 
  Lesson, InsertLesson, lessons,
  UserLesson, InsertUserLesson, userLessons 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { UserService } from "./UserService";
import { UserStatsService } from "./UserStatsService";

/**
 * Service class for handling lesson-related operations
 */
export class LessonService extends BaseService {
  private userService: UserService;
  
  constructor() {
    super();
    this.userService = new UserService();
  }
  
  /**
   * Get all lessons for a specific language
   */
  async getLessonsByLanguage(languageId: number): Promise<Lesson[]> {
    try {
      return await this.db
        .select()
        .from(lessons)
        .where(eq(lessons.languageId, languageId))
        .orderBy(lessons.level, lessons.order);
    } catch (error) {
      this.handleError(error, "LessonService.getLessonsByLanguage");
      return [];
    }
  }

  /**
   * Get all user lessons for a specific language
   */
  async getUserLessonsForLanguage(
    userId: string, 
    languageId: number
  ): Promise<(UserLesson & { lesson: Lesson })[]> {
    try {
      const result = await this.db
        .select()
        .from(userLessons)
        .innerJoin(lessons, eq(userLessons.lessonId, lessons.id))
        .where(
          and(
            eq(userLessons.userId, userId),
            eq(lessons.languageId, languageId)
          )
        );
      
      return result.map(row => ({
        ...row.user_lessons,
        lesson: row.lessons
      })) as (UserLesson & { lesson: Lesson })[];
    } catch (error) {
      this.handleError(error, "LessonService.getUserLessonsForLanguage");
      return [];
    }
  }

  /**
   * Get a specific lesson by ID
   */
  async getLessonById(lessonId: number): Promise<Lesson | null> {
    try {
      const result = await this.db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId));
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.handleError(error, "LessonService.getLessonById");
      return null;
    }
  }

  /**
   * Start a lesson for a user
   */
  async startUserLesson(userLesson: InsertUserLesson): Promise<UserLesson> {
    try {
      // Check if the user is already doing this lesson
      const existingResult = await this.db
        .select()
        .from(userLessons)
        .where(
          and(
            eq(userLessons.userId, userLesson.userId),
            eq(userLessons.lessonId, userLesson.lessonId)
          )
        );
      
      if (existingResult.length > 0) {
        // Update the existing user lesson
        const result = await this.db
          .update(userLessons)
          .set({
            lastAccessed: new Date()
          })
          .where(
            and(
              eq(userLessons.userId, userLesson.userId),
              eq(userLessons.lessonId, userLesson.lessonId)
            )
          )
          .returning();
        
        return result[0];
      }
      
      // Create a new user lesson
      const result = await this.db
        .insert(userLessons)
        .values({
          ...userLesson,
          lastAccessed: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      this.handleError(error, "LessonService.startUserLesson");
      throw error;
    }
  }

  /**
   * Complete a lesson for a user
   */
  async completeUserLesson(
    userId: string, 
    lessonId: number, 
    progress: number
  ): Promise<UserLesson> {
    let chargedContinuation: { mode: "free" | "hearts" | "unlimited" | "blocked"; heartsSpent: number } | null = null;
    try {
      const now = new Date();
      const [existingUserLesson] = await this.db
        .select()
        .from(userLessons)
        .where(
          and(
            eq(userLessons.userId, userId),
            eq(userLessons.lessonId, lessonId)
          )
        );

      if (progress >= 100 && existingUserLesson?.isCompleted) {
        return existingUserLesson;
      }

      const isCompletingNow = progress >= 100 && !existingUserLesson?.isCompleted;
      if (isCompletingNow) {
        const continuation = await UserStatsService.consumeLessonContinuation(userId);
        if (!continuation.allowed) {
          const accessError = new Error(continuation.message);
          (accessError as any).statusCode = 402;
          (accessError as any).code = "DAILY_LESSON_LIMIT_REACHED";
          (accessError as any).details = continuation;
          throw accessError;
        }
        chargedContinuation = continuation;
      }

      // Get the lesson to calculate XP
      const lessonResult = await this.db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId));
      
      if (lessonResult.length === 0) {
        throw new Error(`Lesson with ID ${lessonId} not found`);
      }
      
      const lesson = lessonResult[0];
      
      if (isCompletingNow) {
        // Calculate XP based on lesson difficulty and progress
        const baseXP = lesson.level * 10;
        const progressFactor = progress / 100;
        const xpEarned = Math.round(baseXP * progressFactor);

        // Update user's XP
        await this.userService.addUserXp(userId, xpEarned);

        // Update user's streak
        await this.userService.updateUserStreak(userId);
      }

      if (existingUserLesson) {
        const [updated] = await this.db
          .update(userLessons)
          .set({
            progress,
            isCompleted: progress >= 100 || existingUserLesson.isCompleted,
            completedAt: progress >= 100 && !existingUserLesson.isCompleted ? now : existingUserLesson.completedAt,
            lastAccessed: now
          })
          .where(eq(userLessons.id, existingUserLesson.id))
          .returning();

        return updated;
      }

      const [created] = await this.db
        .insert(userLessons)
        .values({
          userId,
          lessonId,
          progress,
          isCompleted: progress >= 100,
          completedAt: progress >= 100 ? now : null,
          lastAccessed: now
        })
        .returning();

      return created;
    } catch (error) {
      // If completion failed after charging hearts for continuation, refund them.
      if (chargedContinuation?.mode === "hearts" && chargedContinuation.heartsSpent > 0) {
        try {
          await UserStatsService.refundHearts(userId, chargedContinuation.heartsSpent);
        } catch (refundError) {
          this.log(
            `Failed to refund ${chargedContinuation.heartsSpent} heart(s) for user ${userId}: ${String(refundError)}`,
            "error"
          );
        }
      }
      this.handleError(error, "LessonService.completeUserLesson");
      throw error;
    }
  }

  /**
   * Add a new lesson
   */
  async addLesson(lesson: InsertLesson): Promise<Lesson> {
    try {
      const result = await this.db
        .insert(lessons)
        .values(lesson)
        .returning();
      
      return result[0];
    } catch (error) {
      this.handleError(error, "LessonService.addLesson");
      throw error;
    }
  }
}
