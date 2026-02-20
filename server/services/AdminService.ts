import { BaseService } from "./BaseService";
import { users, aiLearningSessions, languages } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

export class AdminService extends BaseService {
  async getStats() {
    try {
      const totalUsers = await this.db.select({ count: sql<number>`count(*)` }).from(users);
      const activeUsers = await this.db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`last_active > now() - interval '24 hours'`);
      const completedLessons = await this.db.select({ count: sql<number>`count(*)` })
        .from(aiLearningSessions)
        .where(eq(aiLearningSessions.isCompleted, true));
      const totalLanguages = await this.db.select({ count: sql<number>`count(*)` }).from(languages);

      return {
        totalUsers: Number(totalUsers[0]?.count || 0),
        activeUsers: Number(activeUsers[0]?.count || 0),
        completedLessons: Number(completedLessons[0]?.count || 0),
        totalLanguages: Number(totalLanguages[0]?.count || 0)
      };
    } catch (error) {
      this.handleError(error, "AdminService.getStats");
    }
  }
}

export const adminService = new AdminService();
