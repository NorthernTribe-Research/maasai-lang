import { BaseService } from './BaseService';
import { db } from '../db';
import { learningProfiles, LearningProfile, InsertLearningProfile } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withTransactionAndRetry } from '../utils/transactions';

/**
 * Learning Profile Service for managing user language learning profiles
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export class LearningProfileService extends BaseService {
  constructor() {
    super();
    this.log("LearningProfileService initialized", "info");
  }

  /**
   * Create a new learning profile for a user
   * Requirements: 2.2, 2.3, 19.4, 19.6
   * Uses transaction to ensure profile creation is atomic
   */
  async createProfile(params: {
    userId: string;
    targetLanguage: string;
    nativeLanguage: string;
  }): Promise<LearningProfile> {
    try {
      this.log(`Creating learning profile for user ${params.userId}`, "info");

      // Check if profile already exists
      const existing = await this.getProfileByUserAndLanguage(
        params.userId,
        params.targetLanguage
      );

      if (existing) {
        throw new Error(`Profile already exists for ${params.targetLanguage}`);
      }

      // Use transaction with retry to ensure atomic creation
      const profile = await withTransactionAndRetry(async (tx) => {
        const [newProfile] = await tx.insert(learningProfiles).values({
          userId: params.userId,
          targetLanguage: params.targetLanguage,
          nativeLanguage: params.nativeLanguage,
          proficiencyLevel: 'Beginner', // Initialize as Beginner
          currentXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          weaknesses: [],
          strengths: [],
          lastActivityDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        return newProfile;
      });

      this.log(`Learning profile created with ID: ${profile.id}`, "info");

      return profile;
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.createProfile");
    }
  }

  /**
   * Get a learning profile by ID
   * Requirements: 2.4
   */
  async getProfileById(profileId: string): Promise<LearningProfile | undefined> {
    try {
      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, profileId)
      });

      return profile;
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.getProfileById");
    }
  }

  /**
   * Get a learning profile by user ID and target language
   * Requirements: 2.4
   */
  async getProfileByUserAndLanguage(
    userId: string,
    targetLanguage: string
  ): Promise<LearningProfile | undefined> {
    try {
      const profile = await db.query.learningProfiles.findFirst({
        where: and(
          eq(learningProfiles.userId, userId),
          eq(learningProfiles.targetLanguage, targetLanguage)
        )
      });

      return profile;
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.getProfileByUserAndLanguage");
    }
  }

  /**
   * Get all learning profiles for a user
   * Requirements: 2.5
   */
  async getUserProfiles(userId: string): Promise<LearningProfile[]> {
    try {
      const profiles = await db.query.learningProfiles.findMany({
        where: eq(learningProfiles.userId, userId),
        orderBy: (learningProfiles, { desc }) => [desc(learningProfiles.lastActivityDate)]
      });

      return profiles;
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.getUserProfiles");
    }
  }

  /**
   * Update proficiency level
   * Requirements: 4.2
   */
  async updateProficiencyLevel(
    profileId: string,
    newLevel: string
  ): Promise<LearningProfile> {
    try {
      this.log(`Updating proficiency level for profile ${profileId} to ${newLevel}`, "info");

      const [profile] = await db.update(learningProfiles)
        .set({
          proficiencyLevel: newLevel,
          updatedAt: new Date()
        })
        .where(eq(learningProfiles.id, profileId))
        .returning();

      return profile;
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.updateProficiencyLevel");
    }
  }

  /**
   * Update weaknesses and strengths
   * Requirements: 4.3, 4.4
   */
  async updateWeaknessesAndStrengths(
    profileId: string,
    weaknesses: string[],
    strengths: string[]
  ): Promise<LearningProfile> {
    try {
      this.log(`Updating weaknesses and strengths for profile ${profileId}`, "info");

      const [profile] = await db.update(learningProfiles)
        .set({
          weaknesses,
          strengths,
          updatedAt: new Date()
        })
        .where(eq(learningProfiles.id, profileId))
        .returning();

      return profile;
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.updateWeaknessesAndStrengths");
    }
  }

  /**
   * Add XP to profile
   * Requirements: 10.1, 10.4
   */
  async addXP(profileId: string, amount: number): Promise<LearningProfile> {
    try {
      const profile = await this.getProfileById(profileId);
      
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      const [updatedProfile] = await db.update(learningProfiles)
        .set({
          currentXP: profile.currentXP + amount,
          lastActivityDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(learningProfiles.id, profileId))
        .returning();

      this.log(`Added ${amount} XP to profile ${profileId}`, "info");

      return updatedProfile;
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.addXP");
    }
  }

  /**
   * Update streak
   * Requirements: 13.1, 13.2, 13.3
   */
  async updateStreak(profileId: string): Promise<LearningProfile> {
    try {
      const profile = await this.getProfileById(profileId);
      
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      const now = new Date();
      const lastActivity = profile.lastActivityDate ? new Date(profile.lastActivityDate) : null;
      
      let newStreak = profile.currentStreak;
      let newLongestStreak = profile.longestStreak;

      if (lastActivity) {
        const daysSinceLastActivity = Math.floor(
          (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastActivity === 0) {
          // Same day, no change
        } else if (daysSinceLastActivity === 1) {
          // Consecutive day, increment streak
          newStreak += 1;
          if (newStreak > newLongestStreak) {
            newLongestStreak = newStreak;
          }
        } else {
          // Streak broken, reset to 1
          newStreak = 1;
        }
      } else {
        // First activity
        newStreak = 1;
        newLongestStreak = 1;
      }

      const [updatedProfile] = await db.update(learningProfiles)
        .set({
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastActivityDate: now,
          updatedAt: now
        })
        .where(eq(learningProfiles.id, profileId))
        .returning();

      this.log(`Updated streak for profile ${profileId}: ${newStreak} days`, "info");

      return updatedProfile;
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.updateStreak");
    }
  }

  /**
   * Get profile statistics
   * Requirements: 15.1, 15.2
   */
  async getProfileStats(profileId: string): Promise<{
    profile: LearningProfile;
    totalLessonsCompleted: number;
    totalExercisesCompleted: number;
    averageAccuracy: number;
  }> {
    try {
      const profile = await this.getProfileById(profileId);
      
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      // Get lesson completions count
      const lessonCompletions = await db.query.lessonCompletions.findMany({
        where: eq(learningProfiles.id, profileId)
      });

      // Get exercise submissions count
      const exerciseSubmissions = await db.query.exerciseSubmissions.findMany({
        where: eq(learningProfiles.id, profileId)
      });

      // Calculate average accuracy
      const correctSubmissions = exerciseSubmissions.filter(s => s.isCorrect).length;
      const averageAccuracy = exerciseSubmissions.length > 0
        ? Math.round((correctSubmissions / exerciseSubmissions.length) * 100)
        : 0;

      return {
        profile,
        totalLessonsCompleted: lessonCompletions.length,
        totalExercisesCompleted: exerciseSubmissions.length,
        averageAccuracy
      };
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.getProfileStats");
    }
  }

  /**
   * Delete a learning profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    try {
      await db.delete(learningProfiles)
        .where(eq(learningProfiles.id, profileId));

      this.log(`Deleted profile ${profileId}`, "info");
    } catch (error) {
      throw this.handleError(error, "LearningProfileService.deleteProfile");
    }
  }
}

export const learningProfileService = new LearningProfileService();
