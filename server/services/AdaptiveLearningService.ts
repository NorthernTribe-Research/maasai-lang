import { BaseService } from './BaseService';
import { db } from '../db';
import { 
  learningProfiles, 
  lessonCompletions,
  exercises,
  exerciseSubmissions,
  voiceSessions,
  pronunciationAnalyses,
  activitySummaries,
  LearningProfile
} from '../../shared/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';

/**
 * Adaptive Learning Service for analyzing performance and adjusting content
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
export class AdaptiveLearningService extends BaseService {
  constructor() {
    super();
    this.log("AdaptiveLearningService initialized", "info");
  }

  /**
   * Analyze performance after a learning activity
   * Requirements: 4.1, 4.2
   */
  async analyzePerformance(params: {
    profileId: string;
    activityType: 'lesson' | 'exercise' | 'voice' | 'pronunciation' | 'tutor';
    metrics: {
      accuracy: number;
      completionTime: number;
      errorsCount: number;
      errorPatterns: string[];
    };
  }): Promise<{
    performanceLevel: 'excellent' | 'good' | 'average' | 'needs_improvement';
    recommendations: string[];
    difficultyAdjustment: number;
  }> {
    try {
      this.log(`Analyzing performance for profile ${params.profileId}`, "info");

      const { accuracy, completionTime, errorsCount, errorPatterns } = params.metrics;

      // Determine performance level
      let performanceLevel: 'excellent' | 'good' | 'average' | 'needs_improvement';
      if (accuracy >= 90) {
        performanceLevel = 'excellent';
      } else if (accuracy >= 75) {
        performanceLevel = 'good';
      } else if (accuracy >= 60) {
        performanceLevel = 'average';
      } else {
        performanceLevel = 'needs_improvement';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (accuracy < 70) {
        recommendations.push("Review fundamental concepts before moving forward");
        recommendations.push("Practice more exercises on weak areas");
      }
      if (errorsCount > 5) {
        recommendations.push("Focus on accuracy over speed");
      }
      if (errorPatterns.length > 0) {
        recommendations.push(`Pay special attention to: ${errorPatterns.join(', ')}`);
      }

      // Calculate difficulty adjustment
      let difficultyAdjustment = 0;
      if (accuracy >= 90 && errorsCount < 2) {
        difficultyAdjustment = 1; // Increase difficulty
      } else if (accuracy < 60 || errorsCount > 8) {
        difficultyAdjustment = -1; // Decrease difficulty
      }

      // Update activity summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.insert(activitySummaries).values({
        profileId: params.profileId,
        date: today,
        activityType: params.activityType,
        count: 1,
        xpEarned: 0, // Will be updated by other services
        averageAccuracy: Math.round(accuracy)
      }).onConflictDoUpdate({
        target: [activitySummaries.profileId, activitySummaries.date, activitySummaries.activityType],
        set: {
          count: sql`${activitySummaries.count} + 1`,
          averageAccuracy: sql`(${activitySummaries.averageAccuracy} + ${Math.round(accuracy)}) / 2`
        }
      });

      return {
        performanceLevel,
        recommendations,
        difficultyAdjustment
      };
    } catch (error) {
      throw this.handleError(error, "AdaptiveLearningService.analyzePerformance");
    }
  }

  /**
   * Update proficiency level based on performance
   * Requirements: 4.6
   */
  async updateProficiencyLevel(profileId: string): Promise<string> {
    try {
      this.log(`Updating proficiency level for profile ${profileId}`, "info");

      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, profileId)
      });

      if (!profile) {
        throw new Error("Learning profile not found");
      }

      // Get recent performance data
      const recentCompletions = await db.query.lessonCompletions.findMany({
        where: eq(lessonCompletions.profileId, profileId),
        limit: 10,
        orderBy: desc(lessonCompletions.completedAt)
      });

      if (recentCompletions.length < 5) {
        return profile.proficiencyLevel; // Not enough data
      }

      // Calculate average accuracy
      const totalAccuracy = recentCompletions.reduce((sum, completion) => {
        const metrics = completion.performanceMetrics as any;
        return sum + (metrics.accuracy || 0);
      }, 0);
      const avgAccuracy = totalAccuracy / recentCompletions.length;

      // Determine if level should change
      let newLevel = profile.proficiencyLevel;
      const currentLevel = profile.proficiencyLevel;

      if (currentLevel === 'Beginner' && avgAccuracy >= 85 && recentCompletions.length >= 10) {
        newLevel = 'Intermediate';
      } else if (currentLevel === 'Intermediate' && avgAccuracy >= 90 && recentCompletions.length >= 20) {
        newLevel = 'Advanced';
      } else if (currentLevel === 'Advanced' && avgAccuracy >= 95 && recentCompletions.length >= 30) {
        newLevel = 'Fluent';
      }

      // Update if changed
      if (newLevel !== currentLevel) {
        await db.update(learningProfiles)
          .set({ 
            proficiencyLevel: newLevel,
            updatedAt: new Date()
          })
          .where(eq(learningProfiles.id, profileId));

        this.log(`Proficiency level updated from ${currentLevel} to ${newLevel}`, "info");
      }

      return newLevel;
    } catch (error) {
      throw this.handleError(error, "AdaptiveLearningService.updateProficiencyLevel");
    }
  }

  /**
   * Identify weakness areas from performance patterns
   * Requirements: 4.5
   */
  async identifyWeaknesses(profileId: string): Promise<Array<{
    topic: string;
    category: 'vocabulary' | 'grammar' | 'pronunciation' | 'listening';
    severity: number;
    identifiedAt: Date;
    improvementRate: number;
  }>> {
    try {
      this.log(`Identifying weaknesses for profile ${profileId}`, "info");

      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, profileId)
      });

      if (!profile) {
        throw new Error("Learning profile not found");
      }

      // Get recent exercise submissions
      const recentExercises = await db.query.exerciseSubmissions.findMany({
        where: eq(exerciseSubmissions.profileId, profileId),
        limit: 50,
        orderBy: desc(exerciseSubmissions.submittedAt)
      });

      // Analyze error patterns
      const errorsByTopic: Map<string, { count: number; total: number }> = new Map();

      for (const submission of recentExercises) {
        const exercise = await db.query.exercises.findFirst({
          where: eq(exercises.id, submission.exerciseId)
        });

        if (exercise && exercise.targetWeakness) {
          const topic = exercise.targetWeakness;
          const stats = errorsByTopic.get(topic) || { count: 0, total: 0 };
          stats.total++;
          if (!submission.isCorrect) {
            stats.count++;
          }
          errorsByTopic.set(topic, stats);
        }
      }

      // Convert to weakness areas
      const weaknesses: Array<any> = [];
      errorsByTopic.forEach((stats, topic) => {
        const errorRate = stats.count / stats.total;
        if (errorRate > 0.3) { // More than 30% error rate
          weaknesses.push({
            topic,
            category: this.categorizeWeakness(topic),
            severity: Math.round(errorRate * 100),
            identifiedAt: new Date(),
            improvementRate: 0 // Would be calculated from historical data
          });
        }
      });

      // Update profile with weaknesses
      await db.update(learningProfiles)
        .set({ 
          weaknesses: weaknesses,
          updatedAt: new Date()
        })
        .where(eq(learningProfiles.id, profileId));

      return weaknesses;
    } catch (error) {
      throw this.handleError(error, "AdaptiveLearningService.identifyWeaknesses");
    }
  }

  /**
   * Adjust difficulty based on recent performance
   * Requirements: 4.3, 4.4
   */
  async adjustDifficulty(params: {
    currentDifficulty: number;
    recentPerformance: Array<{ accuracy: number; completionTime: number }>;
  }): Promise<number> {
    try {
      this.log("Adjusting difficulty based on performance", "info");

      if (params.recentPerformance.length === 0) {
        return params.currentDifficulty;
      }

      // Calculate average accuracy
      const avgAccuracy = params.recentPerformance.reduce((sum, p) => sum + p.accuracy, 0) / params.recentPerformance.length;

      let newDifficulty = params.currentDifficulty;

      // Adjust based on accuracy
      if (avgAccuracy >= 90) {
        newDifficulty = Math.min(10, params.currentDifficulty + 1);
      } else if (avgAccuracy >= 80) {
        newDifficulty = Math.min(10, params.currentDifficulty + 0.5);
      } else if (avgAccuracy < 60) {
        newDifficulty = Math.max(1, params.currentDifficulty - 1);
      } else if (avgAccuracy < 70) {
        newDifficulty = Math.max(1, params.currentDifficulty - 0.5);
      }

      this.log(`Difficulty adjusted from ${params.currentDifficulty} to ${newDifficulty}`, "info");
      return Math.round(newDifficulty * 10) / 10; // Round to 1 decimal
    } catch (error) {
      throw this.handleError(error, "AdaptiveLearningService.adjustDifficulty");
    }
  }

  /**
   * Recommend next activity based on profile
   */
  async recommendNextActivity(profileId: string): Promise<{
    activityType: 'lesson' | 'exercise' | 'voice' | 'pronunciation' | 'review';
    reasoning: string;
    priority: number;
  }> {
    try {
      this.log(`Recommending next activity for profile ${profileId}`, "info");

      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, profileId)
      });

      if (!profile) {
        throw new Error("Learning profile not found");
      }

      // Get recent activity
      const recentLessons = await db.query.lessonCompletions.findMany({
        where: eq(lessonCompletions.profileId, profileId),
        limit: 5,
        orderBy: desc(lessonCompletions.completedAt)
      });

      const recentExercises = await db.query.exerciseSubmissions.findMany({
        where: eq(exerciseSubmissions.profileId, profileId),
        limit: 5,
        orderBy: desc(exerciseSubmissions.submittedAt)
      });

      // Determine recommendation
      if (recentLessons.length === 0) {
        return {
          activityType: 'lesson',
          reasoning: "Start with a structured lesson to build foundation",
          priority: 10
        };
      }

      if (recentExercises.length < recentLessons.length) {
        return {
          activityType: 'exercise',
          reasoning: "Practice what you've learned with exercises",
          priority: 8
        };
      }

      const weaknesses = profile.weaknesses as any[];
      if (weaknesses && weaknesses.length > 0) {
        return {
          activityType: 'review',
          reasoning: "Review weak areas to improve understanding",
          priority: 9
        };
      }

      return {
        activityType: 'lesson',
        reasoning: "Continue learning with the next lesson",
        priority: 7
      };
    } catch (error) {
      throw this.handleError(error, "AdaptiveLearningService.recommendNextActivity");
    }
  }

  /**
   * Helper to categorize weakness
   */
  private categorizeWeakness(topic: string): 'vocabulary' | 'grammar' | 'pronunciation' | 'listening' {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('vocab') || lowerTopic.includes('word')) {
      return 'vocabulary';
    } else if (lowerTopic.includes('grammar') || lowerTopic.includes('tense') || lowerTopic.includes('conjugation')) {
      return 'grammar';
    } else if (lowerTopic.includes('pronunc') || lowerTopic.includes('sound')) {
      return 'pronunciation';
    } else {
      return 'listening';
    }
  }
}

export const adaptiveLearningService = new AdaptiveLearningService();
