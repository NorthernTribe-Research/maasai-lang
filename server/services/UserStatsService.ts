import { db } from "../db";
import { users, xpGains, lessonCompletions, learningProfiles, userLessons, userUnitLegendary } from "../../shared/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { cache } from "../utils/cache";

export interface UserStats {
  xp: number;
  level: number;
  hearts: number;
  maxHearts: number;
  gems: number;
  isPremium: boolean;
  unlimitedHearts: boolean;
  premiumExpiresAt: Date | null;
  streak: number;
  longestStreak: number;
  lastActive: Date;
  freeLessonsPerDay: number;
  lessonsCompletedToday: number;
  remainingFreeLessons: number;
  heartsPerExtraLesson: number;
  nextFreeLessonAt: string;
}

export interface DailyLessonGate {
  freeLessonsPerDay: number;
  completedLessonsToday: number;
  remainingFreeLessons: number;
  heartsPerExtraLesson: number;
  hearts: number;
  hasUnlimitedHearts: boolean;
  canContinueForFree: boolean;
  canContinueWithHearts: boolean;
  canContinue: boolean;
  nextFreeLessonAt: string;
}

export interface LessonContinuationResult {
  allowed: boolean;
  mode: "free" | "hearts" | "unlimited" | "blocked";
  heartsSpent: number;
  heartsRemaining: number;
  gate: DailyLessonGate;
  message: string;
}

export interface LegendaryAttemptAccess {
  unitId: string;
  legendaryGemCost: number;
  gems: number;
  isLegendary: boolean;
  hasUnlimitedLegendary: boolean;
  canAttempt: boolean;
  mode: "gems" | "unlimited" | "blocked" | "completed";
  message: string;
}

export interface LegendaryAttemptResult extends LegendaryAttemptAccess {
  success: boolean;
  gemsSpent: number;
  gemsRemaining: number;
  attempts: number;
  upgradedAt: string;
}

export class UserStatsService {
  private static readonly DEFAULT_FREE_LESSONS_PER_DAY = 3;
  private static readonly DEFAULT_HEARTS_PER_EXTRA_LESSON = 1;
  private static readonly DEFAULT_LEGENDARY_GEM_COST = 100;

  private static getConfiguredFreeLessonsPerDay(): number {
    const raw = Number(process.env.FREE_LESSONS_PER_DAY || this.DEFAULT_FREE_LESSONS_PER_DAY);
    return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : this.DEFAULT_FREE_LESSONS_PER_DAY;
  }

  private static getConfiguredHeartCostPerExtraLesson(): number {
    const raw = Number(process.env.HEARTS_PER_EXTRA_LESSON || this.DEFAULT_HEARTS_PER_EXTRA_LESSON);
    return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : this.DEFAULT_HEARTS_PER_EXTRA_LESSON;
  }

  static getLegendaryGemCost(): number {
    const raw = Number(process.env.LEGENDARY_GEM_COST || this.DEFAULT_LEGENDARY_GEM_COST);
    return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : this.DEFAULT_LEGENDARY_GEM_COST;
  }

  private static getTodayBounds() {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    return { dayStart, nextDay };
  }

  private static isUnlimitedHeartsActive(user: {
    isPremium: boolean;
    unlimitedHearts: boolean;
    premiumExpiresAt: Date | null;
  }): boolean {
    if (!user.isPremium || !user.unlimitedHearts) {
      return false;
    }

    if (!user.premiumExpiresAt) {
      return true;
    }

    return new Date(user.premiumExpiresAt).getTime() > Date.now();
  }

  private static async getRawUser(userId: string) {
    const [user] = await db
      .select({
        xp: users.xp,
        level: users.level,
        hearts: users.hearts,
        maxHearts: users.maxHearts,
        gems: users.gems,
        isPremium: users.isPremium,
        unlimitedHearts: users.unlimitedHearts,
        premiumExpiresAt: users.premiumExpiresAt,
        streak: users.streak,
        longestStreak: users.longestStreak,
        lastActive: users.lastActive,
      })
      .from(users)
      .where(eq(users.id, userId));

    return user || null;
  }

  private static async countCompletedLessonsToday(userId: string): Promise<number> {
    const { dayStart, nextDay } = this.getTodayBounds();

    const [aiCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(lessonCompletions)
      .innerJoin(learningProfiles, eq(lessonCompletions.profileId, learningProfiles.id))
      .where(
        and(
          eq(learningProfiles.userId, userId),
          gte(lessonCompletions.completedAt, dayStart),
          lt(lessonCompletions.completedAt, nextDay),
        ),
      );

    const [legacyCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(userLessons)
      .where(
        and(
          eq(userLessons.userId, userId),
          eq(userLessons.isCompleted, true),
          gte(userLessons.completedAt, dayStart),
          lt(userLessons.completedAt, nextDay),
        ),
      );

    return Number(aiCount?.count || 0) + Number(legacyCount?.count || 0);
  }

  private static async invalidateLearningPathCacheForUser(userId: string): Promise<void> {
    const profiles = await db
      .select({ id: learningProfiles.id })
      .from(learningProfiles)
      .where(eq(learningProfiles.userId, userId));

    for (const profile of profiles) {
      cache.delete(`learning-path:${profile.id}`);
      cache.delete(`lesson:next:${profile.id}`);
    }
  }

  private static async buildDailyLessonGate(userId: string, user: {
    hearts: number;
    isPremium: boolean;
    unlimitedHearts: boolean;
    premiumExpiresAt: Date | null;
  }): Promise<DailyLessonGate> {
    const freeLessonsPerDay = this.getConfiguredFreeLessonsPerDay();
    const heartsPerExtraLesson = this.getConfiguredHeartCostPerExtraLesson();
    const completedLessonsToday = await this.countCompletedLessonsToday(userId);
    const remainingFreeLessons = Math.max(0, freeLessonsPerDay - completedLessonsToday);
    const hasUnlimitedHearts = this.isUnlimitedHeartsActive(user);
    const canContinueForFree = hasUnlimitedHearts || remainingFreeLessons > 0;
    const canContinueWithHearts = !hasUnlimitedHearts && remainingFreeLessons === 0 && user.hearts >= heartsPerExtraLesson;
    const { nextDay } = this.getTodayBounds();

    return {
      freeLessonsPerDay,
      completedLessonsToday,
      remainingFreeLessons,
      heartsPerExtraLesson,
      hearts: user.hearts,
      hasUnlimitedHearts,
      canContinueForFree,
      canContinueWithHearts,
      canContinue: canContinueForFree || canContinueWithHearts,
      nextFreeLessonAt: nextDay.toISOString(),
    };
  }

  /**
   * Get user stats
   */
  static async getUserStats(userId: string): Promise<UserStats | null> {
    const user = await this.getRawUser(userId);
    if (!user) {
      return null;
    }

    const gate = await this.buildDailyLessonGate(userId, user);

    return {
      ...user,
      freeLessonsPerDay: gate.freeLessonsPerDay,
      lessonsCompletedToday: gate.completedLessonsToday,
      remainingFreeLessons: gate.remainingFreeLessons,
      heartsPerExtraLesson: gate.heartsPerExtraLesson,
      nextFreeLessonAt: gate.nextFreeLessonAt,
    };
  }

  static async getDailyLessonGate(userId: string): Promise<DailyLessonGate> {
    const user = await this.getRawUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return this.buildDailyLessonGate(userId, user);
  }

  /**
   * Enforce daily lesson cap and consume hearts when learner exceeds free limit.
   */
  static async consumeLessonContinuation(userId: string): Promise<LessonContinuationResult> {
    const user = await this.getRawUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const gate = await this.buildDailyLessonGate(userId, user);

    if (gate.hasUnlimitedHearts) {
      return {
        allowed: true,
        mode: "unlimited",
        heartsSpent: 0,
        heartsRemaining: gate.hearts,
        gate,
        message: "Unlimited hearts subscription active",
      };
    }

    if (gate.remainingFreeLessons > 0) {
      return {
        allowed: true,
        mode: "free",
        heartsSpent: 0,
        heartsRemaining: gate.hearts,
        gate,
        message: `${gate.remainingFreeLessons} free lesson${gate.remainingFreeLessons === 1 ? "" : "s"} remaining today`,
      };
    }

    if (gate.hearts >= gate.heartsPerExtraLesson) {
      const [updated] = await db
        .update(users)
        .set({
          hearts: sql`${users.hearts} - ${gate.heartsPerExtraLesson}`,
        })
        .where(
          and(
            eq(users.id, userId),
            gte(users.hearts, gate.heartsPerExtraLesson),
          ),
        )
        .returning({
          hearts: users.hearts,
        });

      if (!updated) {
        const refreshedGate = await this.getDailyLessonGate(userId);
        return {
          allowed: false,
          mode: "blocked",
          heartsSpent: 0,
          heartsRemaining: refreshedGate.hearts,
          gate: refreshedGate,
          message: "Not enough hearts. Buy hearts or wait for tomorrow's free lessons.",
        };
      }

      await this.invalidateLearningPathCacheForUser(userId);

      return {
        allowed: true,
        mode: "hearts",
        heartsSpent: gate.heartsPerExtraLesson,
        heartsRemaining: updated.hearts,
        gate: {
          ...gate,
          hearts: updated.hearts,
          canContinueWithHearts: updated.hearts >= gate.heartsPerExtraLesson,
          canContinue: updated.hearts >= gate.heartsPerExtraLesson,
        },
        message: `${gate.heartsPerExtraLesson} heart${gate.heartsPerExtraLesson === 1 ? "" : "s"} used for continued progression`,
      };
    }

    return {
      allowed: false,
      mode: "blocked",
      heartsSpent: 0,
      heartsRemaining: gate.hearts,
      gate,
      message: "Daily free lessons are finished and you don't have enough hearts.",
    };
  }

  /**
   * Refund hearts previously consumed for paid continuation when completion fails.
   */
  static async refundHearts(userId: string, amount: number): Promise<number> {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount === 0) {
      const stats = await this.getUserStats(userId);
      return stats?.hearts || 0;
    }

    const [updated] = await db
      .update(users)
      .set({
        hearts: sql`${users.hearts} + ${safeAmount}`,
      })
      .where(eq(users.id, userId))
      .returning({
        hearts: users.hearts,
      });

    await this.invalidateLearningPathCacheForUser(userId);

    return updated?.hearts || 0;
  }

  static async getLegendaryAttemptAccess(
    userId: string,
    unitId: string
  ): Promise<LegendaryAttemptAccess> {
    const normalizedUnitId = unitId.trim();
    if (!normalizedUnitId) {
      throw new Error("Unit id is required");
    }

    const user = await this.getRawUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const gemCost = this.getLegendaryGemCost();
    const hasUnlimitedLegendary = this.isUnlimitedHeartsActive(user);

    const [legendaryRecord] = await db
      .select({
        id: userUnitLegendary.id,
      })
      .from(userUnitLegendary)
      .where(
        and(
          eq(userUnitLegendary.userId, userId),
          eq(userUnitLegendary.unitId, normalizedUnitId),
        ),
      );

    const isLegendary = !!legendaryRecord;
    if (isLegendary) {
      return {
        unitId: normalizedUnitId,
        legendaryGemCost: gemCost,
        gems: user.gems,
        isLegendary: true,
        hasUnlimitedLegendary,
        canAttempt: true,
        mode: "completed",
        message: "Unit is already legendary.",
      };
    }

    if (hasUnlimitedLegendary) {
      return {
        unitId: normalizedUnitId,
        legendaryGemCost: gemCost,
        gems: user.gems,
        isLegendary: false,
        hasUnlimitedLegendary: true,
        canAttempt: true,
        mode: "unlimited",
        message: "Unlimited legendary attempts active.",
      };
    }

    if (user.gems >= gemCost) {
      return {
        unitId: normalizedUnitId,
        legendaryGemCost: gemCost,
        gems: user.gems,
        isLegendary: false,
        hasUnlimitedLegendary: false,
        canAttempt: true,
        mode: "gems",
        message: `${gemCost} gems required for this legendary attempt.`,
      };
    }

    return {
      unitId: normalizedUnitId,
      legendaryGemCost: gemCost,
      gems: user.gems,
      isLegendary: false,
      hasUnlimitedLegendary: false,
      canAttempt: false,
      mode: "blocked",
      message: "Not enough gems for a legendary attempt.",
    };
  }

  static async attemptLegendaryUnit(
    userId: string,
    unitId: string
  ): Promise<LegendaryAttemptResult> {
    const access = await this.getLegendaryAttemptAccess(userId, unitId);
    const now = new Date();

    if (!access.canAttempt) {
      const accessError = new Error(access.message);
      (accessError as any).statusCode = 402;
      (accessError as any).code = "LEGENDARY_GEMS_REQUIRED";
      (accessError as any).details = access;
      throw accessError;
    }

    if (access.isLegendary) {
      const [existing] = await db
        .select({
          attempts: userUnitLegendary.attempts,
          upgradedAt: userUnitLegendary.upgradedAt,
        })
        .from(userUnitLegendary)
        .where(
          and(
            eq(userUnitLegendary.userId, userId),
            eq(userUnitLegendary.unitId, access.unitId),
          ),
        );

      return {
        ...access,
        success: true,
        gemsSpent: 0,
        gemsRemaining: access.gems,
        attempts: existing?.attempts || 1,
        upgradedAt: new Date(existing?.upgradedAt || now).toISOString(),
      };
    }

    let gemsRemaining = access.gems;
    let gemsSpent = 0;

    if (!access.hasUnlimitedLegendary) {
      const [updatedUser] = await db
        .update(users)
        .set({
          gems: sql`${users.gems} - ${access.legendaryGemCost}`,
        })
        .where(
          and(
            eq(users.id, userId),
            gte(users.gems, access.legendaryGemCost),
          ),
        )
        .returning({
          gems: users.gems,
        });

      if (!updatedUser) {
        const refreshedAccess = await this.getLegendaryAttemptAccess(userId, unitId);
        const accessError = new Error(refreshedAccess.message);
        (accessError as any).statusCode = 402;
        (accessError as any).code = "LEGENDARY_GEMS_REQUIRED";
        (accessError as any).details = refreshedAccess;
        throw accessError;
      }

      gemsSpent = access.legendaryGemCost;
      gemsRemaining = updatedUser.gems;
    }

    const [legendary] = await db
      .insert(userUnitLegendary)
      .values({
        userId,
        unitId: access.unitId,
        attempts: 1,
        upgradedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userUnitLegendary.userId, userUnitLegendary.unitId],
        set: {
          attempts: sql`${userUnitLegendary.attempts} + 1`,
          upgradedAt: now,
          updatedAt: now,
        },
      })
      .returning({
        attempts: userUnitLegendary.attempts,
        upgradedAt: userUnitLegendary.upgradedAt,
      });

    await this.invalidateLearningPathCacheForUser(userId);

    return {
      unitId: access.unitId,
      legendaryGemCost: access.legendaryGemCost,
      gems: gemsRemaining,
      isLegendary: true,
      hasUnlimitedLegendary: access.hasUnlimitedLegendary,
      canAttempt: true,
      mode: access.hasUnlimitedLegendary ? "unlimited" : "gems",
      message: access.hasUnlimitedLegendary
        ? "Legendary attempt started (unlimited subscription)."
        : `${access.legendaryGemCost} gems spent for legendary attempt.`,
      success: true,
      gemsSpent,
      gemsRemaining,
      attempts: legendary?.attempts || 1,
      upgradedAt: new Date(legendary?.upgradedAt || now).toISOString(),
    };
  }

  /**
   * Award XP to user and update level
   */
  static async awardXP(
    userId: string,
    amount: number,
    source: string,
    sourceId?: string,
    profileId?: string
  ): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
    // Get current stats
    const stats = await this.getUserStats(userId);
    if (!stats) throw new Error("User not found");

    const newXP = stats.xp + amount;
    const newLevel = this.calculateLevel(newXP);
    const leveledUp = newLevel > stats.level;

    // Update user XP and level
    await db
      .update(users)
      .set({ xp: newXP, level: newLevel })
      .where(eq(users.id, userId));

    // Record XP gain
    await db.insert(xpGains).values({
      userId,
      profileId: profileId || null,
      amount,
      source,
      sourceId: sourceId || null,
    });

    return { newXP, newLevel, leveledUp };
  }

  /**
   * Calculate level from XP (Duolingo-style progression)
   * Level 1: 0-99 XP
   * Level 2: 100-249 XP
   * Level 3: 250-499 XP
   * Each level requires more XP
   */
  static calculateLevel(xp: number): number {
    if (xp < 100) return 1;
    if (xp < 250) return 2;
    if (xp < 500) return 3;
    if (xp < 1000) return 4;
    if (xp < 2000) return 5;
    
    // After level 5, each level requires 1000 XP
    return 5 + Math.floor((xp - 2000) / 1000);
  }

  /**
   * Lose a heart (on wrong answer)
   */
  static async loseHeart(userId: string): Promise<{ hearts: number; gameOver: boolean }> {
    const user = await this.getRawUser(userId);
    if (!user) throw new Error("User not found");

    if (this.isUnlimitedHeartsActive(user)) {
      return { hearts: user.hearts, gameOver: false };
    }

    const newHearts = Math.max(0, user.hearts - 1);
    const gameOver = newHearts === 0;

    await db
      .update(users)
      .set({ hearts: newHearts })
      .where(eq(users.id, userId));

    await this.invalidateLearningPathCacheForUser(userId);

    return { hearts: newHearts, gameOver };
  }

  /**
   * Restore hearts (daily refill or purchase)
   */
  static async restoreHearts(userId: string, amount: number = 5): Promise<number> {
    const stats = await this.getUserStats(userId);
    if (!stats) throw new Error("User not found");

    const newHearts = Math.min(stats.maxHearts, stats.hearts + amount);

    await db
      .update(users)
      .set({ hearts: newHearts })
      .where(eq(users.id, userId));

    await this.invalidateLearningPathCacheForUser(userId);

    return newHearts;
  }

  /**
   * Update streak (call this on daily activity)
   */
  static async updateStreak(userId: string): Promise<{ streak: number; streakBroken: boolean }> {
    const stats = await this.getUserStats(userId);
    if (!stats) throw new Error("User not found");

    const now = new Date();
    const lastActive = new Date(stats.lastActive);
    const hoursSinceLastActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

    let newStreak = stats.streak;
    let streakBroken = false;

    // If last active was more than 48 hours ago, streak is broken
    if (hoursSinceLastActive > 48) {
      newStreak = 1;
      streakBroken = true;
    }
    // If last active was between 24-48 hours ago, maintain streak
    else if (hoursSinceLastActive > 24) {
      newStreak = stats.streak + 1;
    }
    // If last active was within 24 hours, don't increment (already counted today)
    else {
      newStreak = stats.streak;
    }

    const newLongestStreak = Math.max(stats.longestStreak, newStreak);

    await db
      .update(users)
      .set({
        streak: newStreak,
        longestStreak: newLongestStreak,
        lastActive: now,
        streakUpdatedAt: now,
      })
      .where(eq(users.id, userId));

    return { streak: newStreak, streakBroken };
  }

  /**
   * Freeze streak - purchase or activate a streak freeze
   * The streak freeze protects the user's streak for one day if they miss it.
   * Costs 200 XP to activate.
   */
  static async freezeStreak(userId: string): Promise<{ success: boolean; xpCost: number }> {
    const stats = await this.getUserStats(userId);
    if (!stats) throw new Error("User not found");

    const xpCost = 200;
    if (stats.xp < xpCost) {
      return { success: false, xpCost: 0 };
    }

    // Deduct XP and set streak freeze flag
    // We store the freeze status in the streakUpdatedAt field logic
    // by ensuring the streak doesn't break for an extra day
    await db
      .update(users)
      .set({
        xp: stats.xp - xpCost,
        // Extend the "last active" time by 24 hours to simulate a freeze
        lastActive: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .where(eq(users.id, userId));

    return { success: true, xpCost };
  }

  /**
   * Refill hearts to max (costs 350 XP)
   */
  static async purchaseHeartRefill(userId: string): Promise<{ success: boolean; hearts: number; xpCost: number }> {
    const stats = await this.getUserStats(userId);
    if (!stats) throw new Error("User not found");

    const xpCost = 350;
    if (stats.xp < xpCost) {
      return { success: false, hearts: stats.hearts, xpCost: 0 };
    }

    await db
      .update(users)
      .set({
        xp: stats.xp - xpCost,
        hearts: stats.maxHearts,
      })
      .where(eq(users.id, userId));

    await this.invalidateLearningPathCacheForUser(userId);

    return { success: true, hearts: stats.maxHearts, xpCost };
  }

  /**
   * Simulate real-money heart purchase.
   */
  static async purchaseHeartsWithMoney(
    userId: string,
    packageId: "small" | "medium" | "large" = "small"
  ): Promise<{
    success: boolean;
    hearts: number;
    heartsAdded: number;
    amountUsdCents: number;
    currency: "USD";
    transactionId: string;
  }> {
    const user = await this.getRawUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const packages: Record<"small" | "medium" | "large", { hearts: number; amountUsdCents: number }> = {
      small: { hearts: 5, amountUsdCents: 99 },
      medium: { hearts: 15, amountUsdCents: 249 },
      large: { hearts: 35, amountUsdCents: 499 },
    };

    const selectedPackage = packages[packageId];
    const newHearts = user.hearts + selectedPackage.hearts;
    const newMaxHearts = Math.max(user.maxHearts, newHearts);
    const transactionId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await db
      .update(users)
      .set({
        hearts: newHearts,
        maxHearts: newMaxHearts,
      })
      .where(eq(users.id, userId));

    await this.invalidateLearningPathCacheForUser(userId);

    return {
      success: true,
      hearts: newHearts,
      heartsAdded: selectedPackage.hearts,
      amountUsdCents: selectedPackage.amountUsdCents,
      currency: "USD",
      transactionId,
    };
  }

  /**
   * Simulate unlimited-hearts subscription purchase.
   */
  static async purchaseUnlimitedHeartsSubscription(
    userId: string,
    plan: "monthly" | "yearly" = "monthly"
  ): Promise<{
    success: boolean;
    plan: "monthly" | "yearly";
    amountUsdCents: number;
    expiresAt: string;
    transactionId: string;
  }> {
    const user = await this.getRawUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const plans: Record<"monthly" | "yearly", { amountUsdCents: number; days: number }> = {
      monthly: { amountUsdCents: 999, days: 30 },
      yearly: { amountUsdCents: 8999, days: 365 },
    };

    const selectedPlan = plans[plan];
    const now = new Date();
    const currentExpiry = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
    const effectiveStart = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
    const expiresAt = new Date(effectiveStart);
    expiresAt.setDate(expiresAt.getDate() + selectedPlan.days);
    const transactionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await db
      .update(users)
      .set({
        isPremium: true,
        unlimitedHearts: true,
        premiumExpiresAt: expiresAt,
      })
      .where(eq(users.id, userId));

    await this.invalidateLearningPathCacheForUser(userId);

    return {
      success: true,
      plan,
      amountUsdCents: selectedPlan.amountUsdCents,
      expiresAt: expiresAt.toISOString(),
      transactionId,
    };
  }

  /**
   * Get weekly leaderboard
   */
  static async getWeeklyLeaderboard(limit: number = 50) {
    // Get start of current week (Sunday)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Get XP gains for this week
    const leaderboard = await db
      .select({
        userId: xpGains.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        totalXP: sql<number>`SUM(${xpGains.amount})`.as("total_xp"),
      })
      .from(xpGains)
      .innerJoin(users, eq(xpGains.userId, users.id))
      .where(sql`${xpGains.timestamp} >= ${weekStart}`)
      .groupBy(xpGains.userId, users.username, users.firstName, users.lastName, users.profileImageUrl)
      .orderBy(sql`total_xp DESC`)
      .limit(limit);

    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }
}
