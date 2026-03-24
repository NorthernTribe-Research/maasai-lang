import { BaseService } from './BaseService';
import { db } from '../db';
import { 
  users,
  learningProfiles,
  lessonCompletions,
  exerciseSubmissions,
  voiceSessions,
  pronunciationAnalyses,
  xpGains,
  userAchievements,
  pronunciationTrends
} from '../../shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

/**
 * Progress Service for tracking and analytics
 * Requirements: 15.1-15.6
 */
export class ProgressService extends BaseService {
  constructor() {
    super();
    this.log("ProgressService initialized", "info");
  }

  /**
   * Get comprehensive progress data for a profile
   * Requirements: 15.1, 15.2, 23.3, 23.4
   */
  async getProgressDashboard(profileId: string): Promise<{
    profile: any;
    totalXP: number;
    currentStreak: number;
    proficiencyLevel: string;
    completedLessons: number;
    completedExercises: number;
    voiceSessions: number;
    averageAccuracy: number;
    totalLearningTime: number;
  }> {
    try {
      // Get profile with user data in a single query using join
      const profileWithUser = await db
        .select({
          profile: learningProfiles,
          userXp: users.xp,
          userStreak: users.streak
        })
        .from(learningProfiles)
        .leftJoin(users, eq(learningProfiles.userId, users.id))
        .where(eq(learningProfiles.id, profileId))
        .limit(1);

      if (!profileWithUser || profileWithUser.length === 0) {
        throw new Error("Profile not found");
      }

      const { profile, userXp, userStreak } = profileWithUser[0];

      // Use optimized aggregation queries with indexes
      const [
        completedLessonsResult,
        completedExercisesResult,
        voiceSessionsResult,
        exerciseStats,
        lessonTime,
        voiceTime
      ] = await Promise.all([
        // Count completed lessons
        db
          .select({ count: sql<number>`count(*)` })
          .from(lessonCompletions)
          .where(eq(lessonCompletions.profileId, profileId)),
        
        // Count completed exercises
        db
          .select({ count: sql<number>`count(*)` })
          .from(exerciseSubmissions)
          .where(eq(exerciseSubmissions.profileId, profileId)),
        
        // Count voice sessions
        db
          .select({ count: sql<number>`count(*)` })
          .from(voiceSessions)
          .where(eq(voiceSessions.profileId, profileId)),
        
        // Calculate average accuracy from exercises
        db
          .select({ 
            avgAccuracy: sql<number>`AVG(CASE WHEN ${exerciseSubmissions.isCorrect} THEN 100 ELSE 0 END)` 
          })
          .from(exerciseSubmissions)
          .where(eq(exerciseSubmissions.profileId, profileId)),
        
        // Calculate total learning time from lessons
        db
          .select({ 
            totalTime: sql<number>`COALESCE(SUM(${lessonCompletions.timeSpent}), 0)` 
          })
          .from(lessonCompletions)
          .where(eq(lessonCompletions.profileId, profileId)),
        
        // Calculate total learning time from voice sessions
        db
          .select({ 
            totalTime: sql<number>`COALESCE(SUM(${voiceSessions.duration}), 0)` 
          })
          .from(voiceSessions)
          .where(eq(voiceSessions.profileId, profileId))
      ]);

      const totalLearningTime = (lessonTime[0]?.totalTime || 0) + (voiceTime[0]?.totalTime || 0);

      return {
        profile,
        totalXP: userXp || 0,
        currentStreak: userStreak || 0,
        proficiencyLevel: profile.proficiencyLevel,
        completedLessons: completedLessonsResult[0]?.count || 0,
        completedExercises: completedExercisesResult[0]?.count || 0,
        voiceSessions: voiceSessionsResult[0]?.count || 0,
        averageAccuracy: Math.round(exerciseStats[0]?.avgAccuracy || 0),
        totalLearningTime: Math.round(totalLearningTime)
      };
    } catch (error) {
      throw this.handleError(error, "ProgressService.getProgressDashboard");
    }
  }

  /**
   * Get identified weakness areas
   * Requirements: 15.4
   */
  async getWeaknesses(profileId: string): Promise<{
    weaknesses: string[];
    improvementTrends: Array<{
      area: string;
      recentAccuracy: number;
      trend: 'improving' | 'stable' | 'declining';
    }>;
  }> {
    try {
      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, profileId)
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      const weaknesses = Array.isArray(profile.weaknesses)
        ? (profile.weaknesses as string[])
        : [];

      // Calculate improvement trends for each weakness
      const improvementTrends = await Promise.all(
        weaknesses.map(async (weakness) => {
          // Get recent exercises for this weakness area
          const recentExercises = await db.query.exerciseSubmissions.findMany({
            where: and(
              eq(exerciseSubmissions.profileId, profileId),
              sql`${exerciseSubmissions.createdAt} >= NOW() - INTERVAL '7 days'`
            ),
            limit: 10,
            orderBy: [desc(exerciseSubmissions.createdAt)]
          });

          const recentAccuracy = recentExercises.length > 0
            ? (recentExercises.filter(e => e.isCorrect).length / recentExercises.length) * 100
            : 0;

          // Simple trend calculation (would be more sophisticated in production)
          let trend: 'improving' | 'stable' | 'declining' = 'stable';
          if (recentAccuracy > 70) trend = 'improving';
          else if (recentAccuracy < 50) trend = 'declining';

          return {
            area: weakness,
            recentAccuracy: Math.round(recentAccuracy),
            trend
          };
        })
      );

      return {
        weaknesses,
        improvementTrends
      };
    } catch (error) {
      throw this.handleError(error, "ProgressService.getWeaknesses");
    }
  }

  /**
   * Get pronunciation trends over time
   * Requirements: 15.5, 23.3
   */
  async getPronunciationTrends(profileId: string, limit: number = 30): Promise<{
    overallTrend: Array<{
      date: Date;
      averageScore: number;
    }>;
    phonemeBreakdown: Array<{
      phoneme: string;
      averageScore: number;
      attempts: number;
    }>;
  }> {
    try {
      // Get pronunciation analyses over time using optimized index
      const analyses = await db
        .select()
        .from(pronunciationAnalyses)
        .where(eq(pronunciationAnalyses.profileId, profileId))
        .orderBy(desc(pronunciationAnalyses.timestamp))
        .limit(limit);

      // Group by date for overall trend
      const trendMap = new Map<string, { total: number; count: number }>();
      
      analyses.forEach(analysis => {
        const dateKey = analysis.timestamp.toISOString().split('T')[0];
        const existing = trendMap.get(dateKey) || { total: 0, count: 0 };
        const score = analysis.overallScore || analysis.score;
        trendMap.set(dateKey, {
          total: existing.total + score,
          count: existing.count + 1
        });
      });

      const overallTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
        date: new Date(date),
        averageScore: Math.round(data.total / data.count)
      }));

      // Phoneme breakdown
      const phonemeMap = new Map<string, { total: number; count: number }>();
      
      analyses.forEach(analysis => {
        const phonemes = analysis.problematicPhonemes as string[] || [];
        const score = analysis.overallScore || analysis.score;
        phonemes.forEach(phoneme => {
          const existing = phonemeMap.get(phoneme) || { total: 0, count: 0 };
          phonemeMap.set(phoneme, {
            total: existing.total + score,
            count: existing.count + 1
          });
        });
      });

      const phonemeBreakdown = Array.from(phonemeMap.entries()).map(([phoneme, data]) => ({
        phoneme,
        averageScore: Math.round(data.total / data.count),
        attempts: data.count
      }));

      return {
        overallTrend,
        phonemeBreakdown
      };
    } catch (error) {
      throw this.handleError(error, "ProgressService.getPronunciationTrends");
    }
  }

  /**
   * Get comprehensive analytics with time range filtering
   * Requirements: 15.3, 15.6
   */
  async getAnalytics(params: {
    profileId: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    activityBreakdown: {
      lessons: number;
      exercises: number;
      voiceSessions: number;
      pronunciationPractice: number;
    };
    xpGained: number;
    accuracyTrend: Array<{
      date: Date;
      accuracy: number;
    }>;
    recommendations: string[];
    achievements: {
      earned: any[];
      locked: any[];
    };
  }> {
    try {
      const { profileId, startDate, endDate } = params;

      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, profileId)
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Build date filter
      const dateFilter = startDate && endDate
        ? and(
            gte(sql`created_at`, startDate),
            sql`created_at <= ${endDate}`
          )
        : undefined;

      // Activity breakdown
      const lessonsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(lessonCompletions)
        .where(
          dateFilter
            ? and(eq(lessonCompletions.profileId, profileId), dateFilter)
            : eq(lessonCompletions.profileId, profileId)
        );

      const exercisesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(exerciseSubmissions)
        .where(
          dateFilter
            ? and(eq(exerciseSubmissions.profileId, profileId), dateFilter)
            : eq(exerciseSubmissions.profileId, profileId)
        );

      const voiceSessionsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(voiceSessions)
        .where(
          dateFilter
            ? and(eq(voiceSessions.profileId, profileId), dateFilter)
            : eq(voiceSessions.profileId, profileId)
        );

      const pronunciationCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(pronunciationAnalyses)
        .where(
          dateFilter
            ? and(eq(pronunciationAnalyses.profileId, profileId), dateFilter)
            : eq(pronunciationAnalyses.profileId, profileId)
        );

      // XP gained in period
      const xpGainedResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${xpGains.amount}), 0)` })
        .from(xpGains)
        .where(
          dateFilter
            ? and(eq(xpGains.profileId, profileId), dateFilter)
            : eq(xpGains.profileId, profileId)
        );

      // Accuracy trend (from exercises)
      const exercises = await db.query.exerciseSubmissions.findMany({
        where: dateFilter
          ? and(eq(exerciseSubmissions.profileId, profileId), dateFilter)
          : eq(exerciseSubmissions.profileId, profileId),
        orderBy: [desc(exerciseSubmissions.createdAt)],
        limit: 30
      });

      const accuracyMap = new Map<string, { correct: number; total: number }>();
      exercises.forEach(exercise => {
        const dateKey = exercise.createdAt.toISOString().split('T')[0];
        const existing = accuracyMap.get(dateKey) || { correct: 0, total: 0 };
        accuracyMap.set(dateKey, {
          correct: existing.correct + (exercise.isCorrect ? 1 : 0),
          total: existing.total + 1
        });
      });

      const accuracyTrend = Array.from(accuracyMap.entries()).map(([date, data]) => ({
        date: new Date(date),
        accuracy: Math.round((data.correct / data.total) * 100)
      }));

      // Generate recommendations
      const recommendations = await this.generateRecommendations(profile);

      // Get achievements
      const earnedAchievements = await db.query.userAchievements.findMany({
        where: eq(userAchievements.userId, profile.userId)
      });

      const allAchievements = await db.query.achievements.findMany();
      const earnedIds = new Set(earnedAchievements.map(ua => ua.achievementId));

      const achievements = {
        earned: allAchievements.filter(a => earnedIds.has(a.id)),
        locked: allAchievements.filter(a => !earnedIds.has(a.id))
      };

      return {
        activityBreakdown: {
          lessons: lessonsCount[0]?.count || 0,
          exercises: exercisesCount[0]?.count || 0,
          voiceSessions: voiceSessionsCount[0]?.count || 0,
          pronunciationPractice: pronunciationCount[0]?.count || 0
        },
        xpGained: xpGainedResult[0]?.total || 0,
        accuracyTrend,
        recommendations,
        achievements
      };
    } catch (error) {
      throw this.handleError(error, "ProgressService.getAnalytics");
    }
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(profile: any): Promise<string[]> {
    const recommendations: string[] = [];
    const weaknesses = Array.isArray(profile.weaknesses)
      ? (profile.weaknesses as string[])
      : [];

    // Check weaknesses
    if (weaknesses.length > 0) {
      recommendations.push(
        `Focus on improving ${weaknesses[0]} with targeted exercises`
      );
    }

    // Check proficiency level
    if (profile.proficiencyLevel === 'Beginner') {
      recommendations.push('Complete daily lessons to build your foundation');
    } else if (profile.proficiencyLevel === 'Intermediate') {
      recommendations.push('Practice voice conversations to improve fluency');
    } else if (profile.proficiencyLevel === 'Advanced') {
      recommendations.push('Challenge yourself with complex grammar exercises');
    }

    // Check recent activity
    const recentLessons = await db.query.lessonCompletions.findMany({
      where: and(
        eq(lessonCompletions.profileId, profile.id),
        sql`${lessonCompletions.completedAt} >= NOW() - INTERVAL '7 days'`
      )
    });

    if (recentLessons.length === 0) {
      recommendations.push('Start a new lesson to maintain your learning streak');
    }

    return recommendations;
  }
}

export const progressService = new ProgressService();
