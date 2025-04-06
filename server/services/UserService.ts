import { BaseService } from "./BaseService";
import { User, InsertUser, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isToday } from "date-fns";
import { hashPassword } from "../auth";

/**
 * Service class for handling user-related operations
 */
export class UserService extends BaseService {
  /**
   * Get a user by ID
   */
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id));
      return result[0];
    } catch (error) {
      this.handleError(error, "UserService.getUser");
    }
  }

  /**
   * Get a user by username
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.username, username));
      return result[0];
    } catch (error) {
      this.handleError(error, "UserService.getUserByUsername");
    }
  }

  /**
   * Create a new user
   */
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Hash the password before storing
      const hashedPassword = await hashPassword(insertUser.password);
      const now = new Date();
      
      const result = await this.db.insert(users).values({
        ...insertUser,
        password: hashedPassword,
        lastActive: now,
        streakUpdatedAt: now,
        createdAt: now
      }).returning();
      
      return result[0];
    } catch (error) {
      this.handleError(error, "UserService.createUser");
    }
  }

  /**
   * Update user's streak count
   */
  async updateUserStreak(userId: number): Promise<User> {
    try {
      // Get the current user
      const currentUser = await this.getUser(userId);
      if (!currentUser) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const lastActive = new Date(currentUser.lastActive);
      const now = new Date();
      
      // Check if streak already updated today
      if (isToday(new Date(currentUser.streakUpdatedAt))) {
        // Streak already updated today, just update lastActive
        const result = await this.db.update(users)
          .set({ lastActive: now })
          .where(eq(users.id, userId))
          .returning();
        return result[0];
      }
      
      // Calculate new streak
      const streakIncrement = isToday(lastActive) ? 0 : 1;
      const newStreak = currentUser.streak + streakIncrement;
      
      // Update user streak, lastActive and streakUpdatedAt
      const result = await this.db.update(users)
        .set({
          streak: newStreak,
          lastActive: now,
          streakUpdatedAt: now
        })
        .where(eq(users.id, userId))
        .returning();
      
      return result[0];
    } catch (error) {
      this.handleError(error, "UserService.updateUserStreak");
    }
  }

  /**
   * Add XP to user's account
   */
  async addUserXp(userId: number, xpAmount: number): Promise<User> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const result = await this.db.update(users)
        .set({ xp: user.xp + xpAmount })
        .where(eq(users.id, userId))
        .returning();
      
      return result[0];
    } catch (error) {
      this.handleError(error, "UserService.addUserXp");
    }
  }
}