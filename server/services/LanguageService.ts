import { BaseService } from "./BaseService";
import { 
  Language, InsertLanguage, languages, 
  UserLanguage, InsertUserLanguage, userLanguages 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Service class for handling language-related operations
 */
export class LanguageService extends BaseService {
  /**
   * Get all available languages
   */
  async getAllLanguages(): Promise<Language[]> {
    try {
      return await this.db.select().from(languages);
    } catch (error) {
      this.handleError(error, "LanguageService.getAllLanguages");
    }
  }

  /**
   * Get a language by its code
   */
  async getLanguageByCode(code: string): Promise<Language | undefined> {
    try {
      const result = await this.db.select().from(languages).where(eq(languages.code, code));
      return result[0];
    } catch (error) {
      this.handleError(error, "LanguageService.getLanguageByCode");
    }
  }
  
  /**
   * Get a language by its ID
   */
  async getLanguage(id: number): Promise<Language | undefined> {
    try {
      const result = await this.db.select().from(languages).where(eq(languages.id, id));
      return result[0];
    } catch (error) {
      this.handleError(error, "LanguageService.getLanguage");
    }
  }

  /**
   * Add a new language
   */
  async addLanguage(language: InsertLanguage): Promise<Language> {
    try {
      const result = await this.db.insert(languages).values(language).returning();
      return result[0];
    } catch (error) {
      this.handleError(error, "LanguageService.addLanguage");
    }
  }

  /**
   * Get all languages a user is learning
   */
  async getUserLanguages(userId: number): Promise<(UserLanguage & { language: Language })[]> {
    try {
      const result = await this.db.query.userLanguages.findMany({
        where: eq(userLanguages.userId, userId),
        with: {
          language: true
        }
      });
      
      return result;
    } catch (error) {
      this.handleError(error, "LanguageService.getUserLanguages");
    }
  }

  /**
   * Add a language to user's learning list
   */
  async addUserLanguage(userLanguage: InsertUserLanguage): Promise<UserLanguage> {
    try {
      // Check if the user already has this language
      const existingResult = await this.db.select()
        .from(userLanguages)
        .where(
          and(
            eq(userLanguages.userId, userLanguage.userId),
            eq(userLanguages.languageId, userLanguage.languageId)
          )
        );
      
      if (existingResult.length > 0) {
        return existingResult[0];
      }
      
      // Add the new language
      const result = await this.db.insert(userLanguages)
        .values({
          ...userLanguage,
          lastAccessed: new Date().toISOString()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      this.handleError(error, "LanguageService.addUserLanguage");
    }
  }

  /**
   * Update user's progress in a language
   */
  async updateUserLanguageProgress(
    userId: number, 
    languageId: number, 
    progress: number
  ): Promise<UserLanguage> {
    try {
      const result = await this.db.update(userLanguages)
        .set({ 
          progress,
          lastAccessed: new Date().toISOString()
        })
        .where(
          and(
            eq(userLanguages.userId, userId),
            eq(userLanguages.languageId, languageId)
          )
        )
        .returning();
      
      if (result.length === 0) {
        throw new Error(`UserLanguage for user ${userId} and language ${languageId} not found`);
      }
      
      return result[0];
    } catch (error) {
      this.handleError(error, "LanguageService.updateUserLanguageProgress");
    }
  }
}