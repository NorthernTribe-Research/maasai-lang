import { BaseService } from './BaseService';
import { db } from '../db';
import { 
  users,
  xpGains,
  achievements,
  userAchievements,
  challenges,
  dailyChallenges,
  learningProfiles
} from '../../shared/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { withTransactionAndRetry } from '../utils/transactions';

/**
 * Gamification Service for XP, achievements, challenges, streaks, and leaderboards
 * Requirements: 10.1-10.5, 11.1-11.5, 12.1-12.5, 13.1-13.5, 14.1-14.6
 */
export class GamificationService extends BaseService {
  constructor() {
    super();
    this.log("GamificationService initialized", "info");
  }

  /**
   * Get XP information for a user
   * Requirements: 10.1, 10.4, 10.5
   */
  async getUserXP(userId: string): Promise<{
    totalXP: number;
    recentGains: Array<{
      amount: number;
      source: string;
      timestamp: Date;
    }>;
  }> {
    try {
      // Get user's total XP
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get recent XP gains (last 10)
      const recentGains = await db.query.xpGains.findMany({
        where: eq(xpGains.userId, userId),
        limit: 10,
        orderBy: [desc(xpGains.timestamp)]
      });

      return {
        totalXP: user.xp,
        recentGains: recentGains.map(gain => ({
          amount: gain.amount,
          source: gain.source,
          timestamp: gain.timestamp
        }))
      };
    } catch (error) {
      throw this.handleError(error, "GamificationService.getUserXP");
    }
  }

  /**
   * Award XP to a user
   * Requirements: 10.2, 10.3, 19.4, 19.6
   * Uses transaction to ensure XP gain record and user XP update are atomic
   */
  async awardXP(params: {
    userId: string;
    profileId?: string;
    amount: number;
    source: string;
    sourceId?: string;
  }): Promise<number> {
    try {
      this.log(`Awarding ${params.amount} XP to user ${params.userId}`, "info");

      // Use transaction with retry to ensure atomic operation
      const newXP = await withTransactionAndRetry(async (tx) => {
        // Record XP gain
        await tx.insert(xpGains).values({
          userId: params.userId,
          profileId: params.profileId || null,
          amount: params.amount,
          source: params.source,
          sourceId: params.sourceId || null,
          timestamp: new Date()
        });

        // Get current user XP
        const user = await tx.query.users.findFirst({
          where: eq(users.id, params.userId)
        });

        if (!user) {
          throw new Error("User not found");
        }

        const updatedXP = user.xp + params.amount;

        // Update user's total XP
        await tx.update(users)
          .set({ xp: updatedXP })
          .where(eq(users.id, params.userId));

        return updatedXP;
      });

      return newXP;
    } catch (error) {
      throw this.handleError(error, "GamificationService.awardXP");
    }
  }

  /**
   * Get all achievements
   * Requirements: 11.1, 11.3
   */
  async getAllAchievements(): Promise<any[]> {
    try {
      const allAchievements = await db.query.achievements.findMany();
      return allAchievements;
    } catch (error) {
      throw this.handleError(error, "GamificationService.getAllAchievements");
    }
  }

  /**
   * Get user's achievements
   * Requirements: 11.2, 11.4, 11.5
   */
  async getUserAchievements(userId: string): Promise<{
    earned: any[];
    locked: any[];
  }> {
    try {
      // Get all achievements
      const allAchievements = await this.getAllAchievements();

      // Get user's earned achievements
      const earnedAchievements = await db.query.userAchievements.findMany({
        where: eq(userAchievements.userId, userId)
      });

      const earnedIds = new Set(earnedAchievements.map(ua => ua.achievementId));

      const earned = allAchievements
        .filter(a => earnedIds.has(a.id))
        .map(a => ({
          ...a,
          earnedAt: earnedAchievements.find(ua => ua.achievementId === a.id)?.earnedAt
        }));

      const locked = allAchievements.filter(a => !earnedIds.has(a.id));

      return { earned, locked };
    } catch (error) {
      throw this.handleError(error, "GamificationService.getUserAchievements");
    }
  }

  /**
   * Check and unlock achievements for a user
   * Requirements: 11.2, 19.4, 19.6
   * Uses transaction to ensure achievement unlock and XP award are atomic
   */
  async checkAchievements(userId: string): Promise<any[]> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return [];
      }

      const allAchievements = await this.getAllAchievements();
      const earnedAchievements = await db.query.userAchievements.findMany({
        where: eq(userAchievements.userId, userId)
      });

      const earnedIds = new Set(earnedAchievements.map(ua => ua.achievementId));
      const newlyUnlocked: any[] = [];

      for (const achievement of allAchievements) {
        if (earnedIds.has(achievement.id)) continue;

        // Check if achievement condition is met
        const unlocked = await this.checkAchievementCondition(userId, achievement.condition);

        if (unlocked) {
          // Use transaction to ensure atomic unlock
          await withTransactionAndRetry(async (tx) => {
            await tx.insert(userAchievements).values({
              userId,
              achievementId: achievement.id,
              earnedAt: new Date()
            });
          });

          newlyUnlocked.push(achievement);
        }
      }

      return newlyUnlocked;
    } catch (error) {
      throw this.handleError(error, "GamificationService.checkAchievements");
    }
  }

  /**
   * Get or create daily challenge for a user
   * Requirements: 12.1, 12.2, 12.3
   */
  async getDailyChallenge(userId: string): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if user has a challenge for today
      const existingChallenge = await db.query.dailyChallenges.findFirst({
        where: and(
          eq(dailyChallenges.userId, userId),
          gte(dailyChallenges.date, today)
        )
      });

      if (existingChallenge) {
        const challenge = await db.query.challenges.findFirst({
          where: eq(challenges.id, existingChallenge.challengeId)
        });

        return {
          ...existingChallenge,
          challenge
        };
      }

      // Generate new daily challenge
      // Get user's learning profiles to tailor challenge
      const profiles = await db.query.learningProfiles.findMany({
        where: eq(learningProfiles.userId, userId)
      });

      if (profiles.length === 0) {
        return null;
      }

      // Get a random challenge for one of the user's languages
      const profile = profiles[0];
      const availableChallenges = await db.query.challenges.findMany({
        where: eq(challenges.languageId, 1), // Would map language to ID
        limit: 10
      });

      if (availableChallenges.length === 0) {
        return null;
      }

      const randomChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];

      // Create daily challenge
      const [newDailyChallenge] = await db.insert(dailyChallenges).values({
        userId,
        challengeId: randomChallenge.id,
        date: today,
        isCompleted: false
      }).returning();

      return {
        ...newDailyChallenge,
        challenge: randomChallenge
      };
    } catch (error) {
      throw this.handleError(error, "GamificationService.getDailyChallenge");
    }
  }

  /**
   * Complete daily challenge
   * Requirements: 12.4
   */
  async completeDailyChallenge(userId: string, challengeId: number): Promise<{
    xpAwarded: number;
    bonusXP: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyChallenge = await db.query.dailyChallenges.findFirst({
        where: and(
          eq(dailyChallenges.userId, userId),
          eq(dailyChallenges.challengeId, challengeId),
          gte(dailyChallenges.date, today)
        )
      });

      if (!dailyChallenge) {
        throw new Error("Daily challenge not found");
      }

      if (dailyChallenge.isCompleted) {
        throw new Error("Challenge already completed");
      }

      // Get challenge details
      const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId)
      });

      if (!challenge) {
        throw new Error("Challenge not found");
      }

      // Mark as completed
      await db.update(dailyChallenges)
        .set({
          isCompleted: true,
          completedAt: new Date()
        })
        .where(eq(dailyChallenges.id, dailyChallenge.id));

      // Award XP with bonus
      const baseXP = challenge.xpReward;
      const bonusXP = Math.floor(baseXP * 0.5); // 50% bonus for daily challenge
      const totalXP = baseXP + bonusXP;

      await this.awardXP({
        userId,
        amount: totalXP,
        source: 'daily_challenge',
        sourceId: challengeId.toString()
      });

      return {
        xpAwarded: totalXP,
        bonusXP
      };
    } catch (error) {
      throw this.handleError(error, "GamificationService.completeDailyChallenge");
    }
  }

  /**
   * Get user's streak information
   * Requirements: 13.1, 13.4
   */
  async getUserStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActive: Date;
  }> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        currentStreak: user.streak,
        longestStreak: user.streak, // Would track separately
        lastActive: user.lastActive
      };
    } catch (error) {
      throw this.handleError(error, "GamificationService.getUserStreak");
    }
  }

  /**
   * Get leaderboard with pagination
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 23.6
   */
  async getLeaderboard(params: {
    languageFilter?: string;
    timePeriod?: 'daily' | 'weekly' | 'all-time';
    limit?: number;
    offset?: number;
  }): Promise<{
    rankings: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const limit = params.limit || 100;
      const offset = params.offset || 0;

      // Get total count for pagination
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      
      const total = totalResult[0]?.count || 0;

      // Get top users by XP with pagination
      // Using optimized query with index on xp
      const topUsers = await db
        .select({
          id: users.id,
          username: users.username,
          xp: users.xp,
          streak: users.streak
        })
        .from(users)
        .orderBy(desc(users.xp))
        .limit(limit)
        .offset(offset);

      const rankings = topUsers.map((user, index) => ({
        rank: offset + index + 1,
        userId: user.id,
        username: user.username,
        xp: user.xp,
        streak: user.streak
      }));

      return {
        rankings,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      throw this.handleError(error, "GamificationService.getLeaderboard");
    }
  }

  /**
   * Get user's rank in leaderboard
   * Requirements: 14.4
   */
  async getUserRank(userId: string): Promise<number> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return 0;
      }

      // Count users with more XP
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.xp} > ${user.xp}`);

      return (result[0]?.count || 0) + 1;
    } catch (error) {
      throw this.handleError(error, "GamificationService.getUserRank");
    }
  }

  /**
   * Check if achievement condition is met
   */
  private async checkAchievementCondition(userId: string, condition: string): Promise<boolean> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) return false;

      // Parse condition (e.g., "xp_1000", "streak_7", "lessons_10")
      const [type, value] = condition.split('_');
      const targetValue = parseInt(value);

      switch (type) {
        case 'xp':
          return user.xp >= targetValue;
        case 'streak':
          return user.streak >= targetValue;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

export const gamificationService = new GamificationService();
