import { BaseService } from "./BaseService";
import { 
  Achievement, InsertAchievement, achievements,
  UserAchievement, InsertUserAchievement, userAchievements 
} from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { UserService } from "./UserService";

/**
 * Service class for handling achievement-related operations
 */
export class AchievementService extends BaseService {
  private userService: UserService;
  
  constructor() {
    super();
    this.userService = new UserService();
  }
  
  /**
   * Get all available achievements
   */
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      return await this.db.select().from(achievements);
    } catch (error) {
      throw this.handleError(error, "AchievementService.getAllAchievements");
    }
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
    try {
      const result = await this.db.query.userAchievements.findMany({
        where: eq(userAchievements.userId, userId),
        with: {
          achievement: true
        }
      });
      
      return result;
    } catch (error) {
      throw this.handleError(error, "AchievementService.getUserAchievements");
    }
  }

  /**
   * Award an achievement to a user
   */
  async awardAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    try {
      // Check if the user already has this achievement
      const existingResult = await this.db
        .select()
        .from(userAchievements)
        .where(
          and(
            eq(userAchievements.userId, userAchievement.userId),
            eq(userAchievements.achievementId, userAchievement.achievementId)
          )
        );
      
      if (existingResult.length > 0) {
        return existingResult[0];
      }
      
      // Get the achievement to add XP
      const achievementResult = await this.db
        .select()
        .from(achievements)
        .where(eq(achievements.id, userAchievement.achievementId));
      
      if (achievementResult.length === 0) {
        throw new Error(`Achievement with ID ${userAchievement.achievementId} not found`);
      }
      
      // Default XP reward
      const xpReward = 50;
      
      // Add XP to user
      await this.userService.addUserXp(userAchievement.userId, xpReward);
      
      // Award the achievement
      const result = await this.db
        .insert(userAchievements)
        .values({
          ...userAchievement,
          earnedAt: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      throw this.handleError(error, "AchievementService.awardAchievement");
    }
  }

  /**
   * Add a new achievement
   */
  async addAchievement(achievement: InsertAchievement): Promise<Achievement> {
    try {
      const result = await this.db
        .insert(achievements)
        .values(achievement)
        .returning();
      
      return result[0];
    } catch (error) {
      throw this.handleError(error, "AchievementService.addAchievement");
    }
  }

  /**
   * Check and award achievements based on user's progress
   */
  async checkAchievements(userId: string): Promise<void> {
    try {
      const user = await this.userService.getUser(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Get all available achievements
      const allAchievements = await this.getAllAchievements();
      
      // Get user's current achievements
      const userAchievements = await this.getUserAchievements(userId);
      const earnedAchievementIds = userAchievements.map(ua => ua.achievementId);
      
      // Check for streak achievements
      if (user.streak >= 7 && !earnedAchievementIds.includes(2)) {
        // Week Warrior achievement (ID 2)
        await this.awardAchievement({
          userId,
          achievementId: 2
        });
      }
      
      if (user.streak >= 30 && !earnedAchievementIds.includes(5)) {
        // Monthly Master achievement (ID 5)
        await this.awardAchievement({
          userId,
          achievementId: 5
        });
      }
      
      // More achievement checks can be added here
      
    } catch (error) {
      throw this.handleError(error, "AchievementService.checkAchievements");
    }
  }
}
