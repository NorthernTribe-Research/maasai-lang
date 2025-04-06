import { BaseService } from "./BaseService";
import { 
  Lesson, InsertLesson, lessons,
  UserLesson, InsertUserLesson, userLessons 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { UserService } from "./UserService";

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
    }
  }

  /**
   * Get all user lessons for a specific language
   */
  async getUserLessonsForLanguage(
    userId: number, 
    languageId: number
  ): Promise<(UserLesson & { lesson: Lesson })[]> {
    try {
      const result = await this.db.query.userLessons.findMany({
        where: and(
          eq(userLessons.userId, userId),
          eq(lessons.languageId, languageId)
        ),
        with: {
          lesson: true
        }
      });
      
      return result;
    } catch (error) {
      this.handleError(error, "LessonService.getUserLessonsForLanguage");
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
    }
  }

  /**
   * Complete a lesson for a user
   */
  async completeUserLesson(
    userId: number, 
    lessonId: number, 
    progress: number
  ): Promise<UserLesson> {
    try {
      // Get the lesson to calculate XP
      const lessonResult = await this.db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId));
      
      if (lessonResult.length === 0) {
        throw new Error(`Lesson with ID ${lessonId} not found`);
      }
      
      const lesson = lessonResult[0];
      
      // Calculate XP based on lesson difficulty and progress
      const baseXP = lesson.level * 10;
      const progressFactor = progress / 100;
      const xpEarned = Math.round(baseXP * progressFactor);
      
      // Update user's XP
      await this.userService.addUserXp(userId, xpEarned);
      
      // Update user's streak
      await this.userService.updateUserStreak(userId);
      
      // Update the lesson progress
      const result = await this.db
        .update(userLessons)
        .set({
          progress,
          isCompleted: progress >= 100,
          completedAt: progress >= 100 ? new Date() : null,
          lastAccessed: new Date()
        })
        .where(
          and(
            eq(userLessons.userId, userId),
            eq(userLessons.lessonId, lessonId)
          )
        )
        .returning();
      
      if (result.length === 0) {
        throw new Error(`UserLesson for user ${userId} and lesson ${lessonId} not found`);
      }
      
      return result[0];
    } catch (error) {
      this.handleError(error, "LessonService.completeUserLesson");
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
    }
  }
}