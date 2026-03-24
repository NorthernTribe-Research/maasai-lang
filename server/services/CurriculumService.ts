import { BaseService } from './BaseService';
import { aiServiceMonitor } from './AIServiceMonitor';
import { UserStatsService } from './UserStatsService';
import { db } from '../db';
import { cache } from '../utils/cache';
import { 
  learningProfiles, 
  curricula, 
  enhancedLessons, 
  lessonCompletions,
  xpGains,
  LearningProfile,
  Curriculum,
  EnhancedLesson
} from '../../shared/schema';
import { and, eq, asc, desc } from 'drizzle-orm';
import { withTransactionAndRetry } from '../utils/transactions';

export type TimelineLessonState = 'locked' | 'available' | 'in-progress' | 'completed';

export interface TimelineLessonItem {
  id: string;
  title: string;
  orderIndex: number;
  estimatedDuration: number;
  unlockAt: string;
  timelineDay: number;
  state: TimelineLessonState;
  isCompleted: boolean;
  isUnlockedBySchedule: boolean;
  accessMode?: 'free' | 'hearts' | 'unlimited' | 'blocked';
  heartsRequired?: number;
  dailyLimitReached?: boolean;
  availableTomorrowAt?: string;
  completionDate?: string;
}

export interface LessonTimeline {
  profileId: string;
  curriculumId: string;
  targetLanguage: string;
  generatedAt: string;
  lessonsPerDay: number;
  dailyFreeLessonsLimit: number;
  dailyCompletedLessons: number;
  remainingFreeLessons: number;
  heartsPerExtraLesson: number;
  hasUnlimitedHearts: boolean;
  completedCount: number;
  totalLessons: number;
  completionPercent: number;
  lessons: TimelineLessonItem[];
}

/**
 * Curriculum Service for generating and managing learning paths
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 5.1
 */
export class CurriculumService extends BaseService {
  constructor() {
    super();
    this.log("CurriculumService initialized", "info");
  }

  private normalizeLessonIds(rawLessons: unknown): string[] {
    if (!Array.isArray(rawLessons)) {
      return [];
    }

    return rawLessons
      .filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  private async getProfile(profileId: string): Promise<LearningProfile> {
    const profile = await db.query.learningProfiles.findFirst({
      where: eq(learningProfiles.id, profileId)
    });

    if (!profile) {
      throw new Error("Learning profile not found");
    }

    return profile;
  }

  private async getLatestCurriculum(profileId: string): Promise<Curriculum | null> {
    const curriculum = await db.query.curricula.findFirst({
      where: eq(curricula.profileId, profileId),
      orderBy: [desc(curricula.generatedAt)]
    });

    return curriculum || null;
  }

  private async getOrCreateCurriculum(profileId: string): Promise<Curriculum> {
    const profile = await this.getProfile(profileId);
    const existing = await this.getLatestCurriculum(profileId);

    if (existing && this.normalizeLessonIds(existing.lessons).length > 0) {
      return existing;
    }

    return this.generateLearningPath({
      profileId,
      targetLanguage: profile.targetLanguage,
      nativeLanguage: profile.nativeLanguage
    });
  }

  private async getOrderedLessons(curriculum: Curriculum): Promise<EnhancedLesson[]> {
    const lessons = await db.query.enhancedLessons.findMany({
      where: eq(enhancedLessons.curriculumId, curriculum.id),
      orderBy: [asc(enhancedLessons.orderIndex), asc(enhancedLessons.createdAt)]
    });

    if (lessons.length === 0) {
      return [];
    }

    const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const orderedIds = this.normalizeLessonIds(curriculum.lessons);

    if (orderedIds.length === 0) {
      return lessons;
    }

    const orderedLessons = orderedIds
      .map((lessonId) => lessonMap.get(lessonId))
      .filter((lesson): lesson is EnhancedLesson => !!lesson);

    if (orderedLessons.length === lessons.length) {
      return orderedLessons;
    }

    const orderedSet = new Set(orderedLessons.map((lesson) => lesson.id));
    const missing = lessons.filter((lesson) => !orderedSet.has(lesson.id));
    return [...orderedLessons, ...missing];
  }

  /**
   * Generate a complete learning path for a profile
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 23.2
   */
  async generateLearningPath(params: {
    profileId: string;
    targetLanguage: string;
    nativeLanguage: string;
  }): Promise<Curriculum> {
    try {
      this.log(`Generating learning path for profile ${params.profileId}`, "info");

      // Check cache first
      const cacheKey = `curriculum:generate:${params.profileId}:${params.targetLanguage}`;
      const cached = cache.get<Curriculum>(cacheKey);
      if (cached) {
        this.log(`Returning cached curriculum for profile ${params.profileId}`, "info");
        return cached;
      }

      // Get the learning profile
      const profile = await this.getProfile(params.profileId);

      // Generate curriculum using AI with monitoring
      const curriculumData = await aiServiceMonitor.generateCurriculumWithFallback({
        targetLanguage: params.targetLanguage,
        nativeLanguage: params.nativeLanguage,
        proficiencyLevel: profile.proficiencyLevel
      });

      // Create curriculum record
      const [curriculum] = await db.insert(curricula).values({
        profileId: params.profileId,
        targetLanguage: params.targetLanguage,
        lessons: [], // Will be populated with lesson IDs
        generatedAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const aiLessons = Array.isArray(curriculumData?.curriculum?.lessons)
        ? curriculumData.curriculum.lessons
        : [];
      const orderedAiLessons = aiLessons
        .map((lessonData: any, index: number) => ({
          ...lessonData,
          orderIndex: Number.isFinite(Number(lessonData?.orderIndex))
            ? Number(lessonData.orderIndex)
            : index + 1,
        }))
        .sort((a: any, b: any) => a.orderIndex - b.orderIndex);

      // Create lesson records
      const lessonIds: string[] = [];
      if (orderedAiLessons.length > 0) {
        for (let index = 0; index < orderedAiLessons.length; index++) {
          const lessonData = orderedAiLessons[index];
          const [lesson] = await db.insert(enhancedLessons).values({
            curriculumId: curriculum.id,
            title: lessonData.title || `Lesson ${index + 1}`,
            proficiencyLevel: profile.proficiencyLevel,
            orderIndex: lessonData.orderIndex || index + 1,
            vocabulary: lessonData.vocabulary || [],
            grammar: lessonData.grammar || [],
            culturalContent: lessonData.culturalContent || [],
            estimatedDuration: lessonData.estimatedDuration || 30,
            createdAt: new Date()
          }).returning();

          lessonIds.push(lesson.id);
        }
      }

      // Update curriculum with lesson IDs
      const [updatedCurriculum] = await db.update(curricula)
        .set({ lessons: lessonIds })
        .where(eq(curricula.id, curriculum.id))
        .returning();

      // Cache the generated curriculum (24 hours TTL)
      cache.set(cacheKey, updatedCurriculum, cache.getTTL('CURRICULUM'));
      cache.delete(`learning-path:${params.profileId}`);

      this.log(`Learning path generated with ${lessonIds.length} lessons`, "info");
      return updatedCurriculum;
    } catch (error) {
      throw this.handleError(error, "CurriculumService.generateLearningPath");
    }
  }

  /**
   * Build timeline-based lesson progression for a profile
   */
  async getLessonTimeline(
    profileId: string,
    options?: { lessonsPerDay?: number }
  ): Promise<LessonTimeline> {
    try {
      const timelineCacheKey = `learning-path:${profileId}`;
      const cachedTimeline = cache.get<LessonTimeline>(timelineCacheKey);
      if (cachedTimeline) {
        return cachedTimeline;
      }

      const profile = await this.getProfile(profileId);
      const curriculum = await this.getOrCreateCurriculum(profileId);
      const lessons = await this.getOrderedLessons(curriculum);
      const lessonGate = await UserStatsService.getDailyLessonGate(profile.userId);

      const completions = await db.query.lessonCompletions.findMany({
        where: eq(lessonCompletions.profileId, profileId)
      });
      const completionMap = new Map(
        completions.map((completion) => [completion.lessonId, completion.completedAt])
      );

      const lessonsPerDay = Math.max(1, options?.lessonsPerDay || 1);
      const now = new Date();
      const scheduleStart = new Date(curriculum.generatedAt);
      scheduleStart.setHours(0, 0, 0, 0);

      let encounteredUncompleted = false;
      let hasActiveLesson = false;
      const timelineLessons: TimelineLessonItem[] = [];

      for (let index = 0; index < lessons.length; index++) {
        const lesson = lessons[index];
        const dayOffset = Math.floor(index / lessonsPerDay);
        const unlockAt = new Date(scheduleStart);
        unlockAt.setDate(scheduleStart.getDate() + dayOffset);

        const completedAt = completionMap.get(lesson.id);
        const isCompleted = !!completedAt;
        const prerequisitesMet = !encounteredUncompleted;
        const isUnlockedBySchedule = unlockAt.getTime() <= now.getTime();

        let state: TimelineLessonState = 'locked';
        if (isCompleted) {
          state = 'completed';
        } else if (prerequisitesMet && isUnlockedBySchedule) {
          state = hasActiveLesson ? 'available' : 'in-progress';
          hasActiveLesson = true;
        }

        if (!isCompleted) {
          encounteredUncompleted = true;
        }

        timelineLessons.push({
          id: lesson.id,
          title: lesson.title,
          orderIndex: lesson.orderIndex,
          estimatedDuration: lesson.estimatedDuration,
          unlockAt: unlockAt.toISOString(),
          timelineDay: dayOffset + 1,
          state,
          isCompleted,
          isUnlockedBySchedule,
          completionDate: completedAt ? new Date(completedAt).toISOString() : undefined
        });
      }

      const completedCount = timelineLessons.filter((lesson) => lesson.isCompleted).length;
      const totalLessons = timelineLessons.length;
      const completionPercent = totalLessons === 0
        ? 0
        : Math.round((completedCount / totalLessons) * 100);

      const activeLesson = timelineLessons.find(
        (lesson) => lesson.state === 'in-progress' || lesson.state === 'available'
      );

      if (activeLesson) {
        if (lessonGate.hasUnlimitedHearts) {
          activeLesson.accessMode = 'unlimited';
        } else if (lessonGate.remainingFreeLessons > 0) {
          activeLesson.accessMode = 'free';
        } else if (lessonGate.hearts >= lessonGate.heartsPerExtraLesson) {
          activeLesson.accessMode = 'hearts';
          activeLesson.heartsRequired = lessonGate.heartsPerExtraLesson;
          activeLesson.dailyLimitReached = true;
        } else {
          activeLesson.state = 'locked';
          activeLesson.accessMode = 'blocked';
          activeLesson.heartsRequired = lessonGate.heartsPerExtraLesson;
          activeLesson.dailyLimitReached = true;
          activeLesson.availableTomorrowAt = lessonGate.nextFreeLessonAt;
        }
      }

      const timeline: LessonTimeline = {
        profileId,
        curriculumId: curriculum.id,
        targetLanguage: profile.targetLanguage,
        generatedAt: new Date(curriculum.generatedAt).toISOString(),
        lessonsPerDay,
        dailyFreeLessonsLimit: lessonGate.freeLessonsPerDay,
        dailyCompletedLessons: lessonGate.completedLessonsToday,
        remainingFreeLessons: lessonGate.remainingFreeLessons,
        heartsPerExtraLesson: lessonGate.heartsPerExtraLesson,
        hasUnlimitedHearts: lessonGate.hasUnlimitedHearts,
        completedCount,
        totalLessons,
        completionPercent,
        lessons: timelineLessons
      };

      // Short TTL keeps timeline fresh around unlock boundaries.
      cache.set(timelineCacheKey, timeline, 5 * 60 * 1000);
      return timeline;
    } catch (error) {
      throw this.handleError(error, "CurriculumService.getLessonTimeline");
    }
  }

  /**
   * Get the next lesson for a learner based on their profile
   * Requirements: 5.1, 23.2
   */
  async getNextLesson(profileId: string): Promise<EnhancedLesson | null> {
    try {
      this.log(`Getting next lesson for profile ${profileId}`, "info");

      // Check cache first
      const cacheKey = `lesson:next:${profileId}`;
      const cached = cache.get<EnhancedLesson>(cacheKey);
      if (cached) {
        this.log(`Returning cached next lesson for profile ${profileId}`, "info");
        return cached;
      }

      const timeline = await this.getLessonTimeline(profileId);
      const nextTimelineLesson = timeline.lessons.find(
        (lesson) => lesson.state === 'in-progress' || lesson.state === 'available'
      );

      if (!nextTimelineLesson) {
        this.log("No unlocked lessons available in timeline", "info");
        return null;
      }

      const lesson = await db.query.enhancedLessons.findFirst({
        where: eq(enhancedLessons.id, nextTimelineLesson.id)
      });

      if (!lesson) {
        return null;
      }

      this.log(`Next lesson found: ${lesson.title}`, "info");
      cache.set(cacheKey, lesson, cache.getTTL('LESSON'));
      return lesson;
    } catch (error) {
      throw this.handleError(error, "CurriculumService.getNextLesson");
    }
  }

  /**
   * Get a specific lesson by ID
   * Requirements: 5.1, 23.2
   */
  async getLessonById(lessonId: string): Promise<EnhancedLesson | null> {
    try {
      this.log(`Getting lesson ${lessonId}`, "info");

      // Check cache first
      const cacheKey = `lesson:${lessonId}`;
      const cached = cache.get<EnhancedLesson>(cacheKey);
      if (cached) {
        this.log(`Returning cached lesson ${lessonId}`, "info");
        return cached;
      }

      const lesson = await db.query.enhancedLessons.findFirst({
        where: eq(enhancedLessons.id, lessonId)
      });

      if (lesson) {
        // Cache the lesson (12 hours TTL)
        cache.set(cacheKey, lesson, cache.getTTL('LESSON'));
      }

      return lesson || null;
    } catch (error) {
      throw this.handleError(error, "CurriculumService.getLessonById");
    }
  }

  /**
   * Mark a lesson as complete and record performance
   * Requirements: 5.6, 10.1, 23.2
   */
  /**
   * Mark a lesson as complete
   * Requirements: 5.6, 19.4, 19.6
   * Uses transaction to ensure lesson completion, XP gain, and profile update are atomic
   */
  async markLessonComplete(params: {
    lessonId: string;
    profileId: string;
    metrics: {
      accuracy: number;
      completionTime: number;
      errorsCount: number;
      errorPatterns: string[];
    };
  }): Promise<{ xpAwarded: number; profileUpdates: any }> {
    try {
      this.log(`Marking lesson ${params.lessonId} complete for profile ${params.profileId}`, "info");
      let chargedContinuation: { mode: "free" | "hearts" | "unlimited" | "blocked"; heartsSpent: number; heartsRemaining: number } | null = null;

      // Get the lesson
      const lesson = await this.getLessonById(params.lessonId);
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Get profile to get userId
      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, params.profileId)
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      const existingCompletion = await db.query.lessonCompletions.findFirst({
        where: and(
          eq(lessonCompletions.lessonId, params.lessonId),
          eq(lessonCompletions.profileId, params.profileId)
        )
      });

      if (existingCompletion) {
        return {
          xpAwarded: 0,
          profileUpdates: {
            currentXP: profile.currentXP,
            lessonsCompleted: 0,
            alreadyCompleted: true
          }
        };
      }

      const continuation = await UserStatsService.consumeLessonContinuation(profile.userId);
      if (!continuation.allowed) {
        const accessError = new Error(continuation.message);
        (accessError as any).statusCode = 402;
        (accessError as any).code = 'DAILY_LESSON_LIMIT_REACHED';
        (accessError as any).details = continuation;
        throw accessError;
      }
      chargedContinuation = continuation;

      // Calculate XP based on performance and difficulty
      const baseXP = 100;
      const accuracyBonus = Math.floor(params.metrics.accuracy * 0.5); // Up to 50 bonus XP
      const xpAwarded = baseXP + accuracyBonus;

      // Use transaction with retry to ensure atomic operation
      let result: { newXP: number };
      try {
        result = await withTransactionAndRetry(async (tx) => {
          // Record lesson completion
          await tx.insert(lessonCompletions).values({
            lessonId: params.lessonId,
            profileId: params.profileId,
            completedAt: new Date(),
            performanceMetrics: params.metrics,
            xpAwarded
          });

          // Record XP gain
          await tx.insert(xpGains).values({
            userId: profile.userId,
            profileId: params.profileId,
            amount: xpAwarded,
            source: 'lesson',
            sourceId: params.lessonId,
            timestamp: new Date()
          });

          // Update profile XP and last activity
          const newXP = profile.currentXP + xpAwarded;
          await tx.update(learningProfiles)
            .set({ 
              currentXP: newXP,
              lastActivityDate: new Date(),
              updatedAt: new Date()
            })
            .where(eq(learningProfiles.id, params.profileId));

          return { newXP };
        });
      } catch (transactionError) {
        if (chargedContinuation?.mode === 'hearts' && chargedContinuation.heartsSpent > 0) {
          try {
            await UserStatsService.refundHearts(profile.userId, chargedContinuation.heartsSpent);
          } catch (refundError) {
            this.log(
              `Failed to refund ${chargedContinuation.heartsSpent} heart(s) for user ${profile.userId}: ${String(refundError)}`,
              "error"
            );
          }
        }
        throw transactionError;
      }

      // Invalidate caches related to this profile
      cache.delete(`lesson:next:${params.profileId}`);
      cache.delete(`profile:${params.profileId}`);
      cache.delete(`learning-path:${params.profileId}`);

      this.log(`Lesson completed, awarded ${xpAwarded} XP`, "info");

      return {
        xpAwarded,
        profileUpdates: {
          currentXP: result.newXP,
          lessonsCompleted: 1,
          continuationMode: continuation.mode,
          heartsSpent: continuation.heartsSpent,
          heartsRemaining: continuation.heartsRemaining,
        }
      };
    } catch (error) {
      throw this.handleError(error, "CurriculumService.markLessonComplete");
    }
  }

  /**
   * Get lesson history for a profile
   */
  async getLessonHistory(profileId: string, limit: number = 10): Promise<any[]> {
    try {
      this.log(`Getting lesson history for profile ${profileId}`, "info");

      const completions = await db.query.lessonCompletions.findMany({
        where: eq(lessonCompletions.profileId, profileId),
        limit,
        orderBy: (lessonCompletions, { desc }) => [desc(lessonCompletions.completedAt)]
      });

      const history = [];
      for (const completion of completions) {
        const lesson = await this.getLessonById(completion.lessonId);
        if (lesson) {
          history.push({
            lesson,
            completion
          });
        }
      }

      return history;
    } catch (error) {
      throw this.handleError(error, "CurriculumService.getLessonHistory");
    }
  }
}

export const curriculumService = new CurriculumService();
