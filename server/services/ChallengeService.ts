import { BaseService } from "./BaseService";
import { 
  Challenge, InsertChallenge, challenges,
  DailyChallenge, InsertDailyChallenge, dailyChallenges,
  users
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { startOfDay, isToday } from "date-fns";
import { UserService } from "./UserService";

/**
 * Service class for handling challenge-related operations
 */
export class ChallengeService extends BaseService {
  private userService: UserService;
  
  constructor() {
    super();
    this.userService = new UserService();
  }
  
  /**
   * Get daily challenge for a user
   */
  async getDailyChallenge(userId: number): Promise<(DailyChallenge & { challenge: Challenge }) | null> {
    try {
      // Get today's date at midnight
      const today = startOfDay(new Date());
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check if user already has a challenge for today
      let userDailyChallenge = await this.db.query.dailyChallenges.findFirst({
        where: and(
          eq(dailyChallenges.userId, userId),
          sql`DATE(${dailyChallenges.date}) = ${todayString}`
        ),
        with: {
          challenge: true
        }
      });
      
      if (userDailyChallenge) {
        return userDailyChallenge;
      }
      
      // Get a random challenge
      const allChallenges = await this.db.select().from(challenges);
      
      if (allChallenges.length === 0) {
        return null;
      }
      
      const randomChallenge = allChallenges[Math.floor(Math.random() * allChallenges.length)];
      
      // Create new daily challenge for user
      const newDailyChallenge: InsertDailyChallenge = {
        userId,
        challengeId: randomChallenge.id,
        isCompleted: false,
        date: today // Pass Date object directly
      };
      
      const result = await this.db
        .insert(dailyChallenges)
        .values(newDailyChallenge)
        .returning();
      
      if (result.length === 0) {
        return null;
      }
      
      return {
        ...result[0],
        challenge: randomChallenge
      };
    } catch (error) {
      this.handleError(error, "ChallengeService.getDailyChallenge");
    }
  }

  /**
   * Complete a daily challenge
   */
  async completeDailyChallenge(
    userId: number,
    challengeId: number,
    isCorrect: boolean
  ): Promise<{ success: boolean; xpEarned: number }> {
    try {
      // Get today's date at midnight
      const today = startOfDay(new Date());
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Find the daily challenge
      const dailyChallengeResult = await this.db
        .select()
        .from(dailyChallenges)
        .where(
          and(
            eq(dailyChallenges.userId, userId),
            eq(dailyChallenges.challengeId, challengeId),
            sql`DATE(${dailyChallenges.date}) = ${todayString}`
          )
        );
      
      if (dailyChallengeResult.length === 0) {
        throw new Error("Daily challenge not found");
      }
      
      const dailyChallenge = dailyChallengeResult[0];
      
      if (dailyChallenge.isCompleted) {
        return { success: true, xpEarned: 0 }; // Already completed
      }
      
      // Mark as completed
      const now = new Date();
      await this.db
        .update(dailyChallenges)
        .set({
          isCompleted: true,
          completedAt: now
        })
        .where(eq(dailyChallenges.id, dailyChallenge.id));
      
      // If correct answer, award XP
      let xpEarned = 0;
      if (isCorrect) {
        xpEarned = 20; // Base XP for daily challenge
        
        // Award XP to user
        await this.userService.addUserXp(userId, xpEarned);
        
        // Update streak
        await this.userService.updateUserStreak(userId);
      }
      
      return { success: true, xpEarned };
    } catch (error) {
      this.handleError(error, "ChallengeService.completeDailyChallenge");
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(): Promise<{ 
    id: number; 
    username: string; 
    displayName: string | null; 
    xp: number; 
    languageId?: number; 
    languageName?: string; 
  }[]> {
    try {
      // Basic leaderboard based on XP
      const result = await this.db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          xp: users.xp
        })
        .from(users)
        .orderBy(desc(users.xp))
        .limit(10);
      
      return result;
    } catch (error) {
      this.handleError(error, "ChallengeService.getLeaderboard");
    }
  }

  /**
   * Add a new challenge
   */
  async addChallenge(challenge: InsertChallenge): Promise<Challenge> {
    try {
      const result = await this.db
        .insert(challenges)
        .values(challenge)
        .returning();
      
      return result[0];
    } catch (error) {
      this.handleError(error, "ChallengeService.addChallenge");
    }
  }
}