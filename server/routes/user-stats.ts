import { Request, Router } from "express";
import { UserStatsService } from "../services/UserStatsService";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { StripeCheckoutError, StripeCheckoutService } from "../services/StripeCheckoutService";

const router = Router();

function resolveAppBaseUrl(req: Request): string {
  const configuredBaseUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host");

  if (!host) {
    return "http://localhost:5000";
  }

  return `${protocol}://${host}`;
}

// Migration endpoint (admin only)
router.post("/migrate/hearts", requireAuth, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Add columns if they don't exist
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS hearts INTEGER NOT NULL DEFAULT 5,
      ADD COLUMN IF NOT EXISTS max_hearts INTEGER NOT NULL DEFAULT 5,
      ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 500,
      ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS unlimited_hearts BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_unit_legendary (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        unit_id VARCHAR(64) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        upgraded_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS user_unit_legendary_user_unit_idx
      ON user_unit_legendary(user_id, unit_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_unit_legendary_user_idx
      ON user_unit_legendary(user_id);
    `);

    // Create index for leaderboard queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS users_xp_streak_idx ON users(xp DESC, streak DESC);
    `);

    // Update existing users to have hearts
    await db.execute(sql`
      UPDATE users 
      SET hearts = 5, max_hearts = 5, gems = 500, level = 1, longest_streak = 0, is_premium = FALSE, unlimited_hearts = FALSE
      WHERE hearts IS NULL;
    `);

    res.json({ success: true, message: "Hearts system migration completed" });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ error: "Migration failed" });
  }
});

// Get current user stats
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const stats = await UserStatsService.getUserStats(userId);

    if (!stats) {
      return res.status(404).json({ error: "User stats not found" });
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// Get weekly leaderboard
router.get("/leaderboard/weekly", requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const leaderboard = await UserStatsService.getWeeklyLeaderboard(limit);

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// Lose a heart (called when user gets answer wrong)
router.post("/hearts/lose", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await UserStatsService.loseHeart(userId);

    res.json(result);
  } catch (error) {
    console.error("Error losing heart:", error);
    res.status(500).json({ error: "Failed to lose heart" });
  }
});

// Restore hearts (daily refill or purchase)
router.post("/hearts/restore", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const amount = req.body.amount || 5;
    const hearts = await UserStatsService.restoreHearts(userId, amount);

    res.json({ hearts });
  } catch (error) {
    console.error("Error restoring hearts:", error);
    res.status(500).json({ error: "Failed to restore hearts" });
  }
});

// Update streak (called on daily activity)
router.post("/streak/update", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await UserStatsService.updateStreak(userId);

    res.json(result);
  } catch (error) {
    console.error("Error updating streak:", error);
    res.status(500).json({ error: "Failed to update streak" });
  }
});

// Freeze streak (costs XP)
router.post("/streak/freeze", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await UserStatsService.freezeStreak(userId);

    if (!result.success) {
      return res.status(400).json({ error: "Not enough XP to freeze streak (200 XP required)" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error freezing streak:", error);
    res.status(500).json({ error: "Failed to freeze streak" });
  }
});

// Purchase heart refill (costs XP)
router.post("/hearts/purchase", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await UserStatsService.purchaseHeartRefill(userId);

    if (!result.success) {
      return res.status(400).json({ error: "Not enough XP to purchase hearts (350 XP required)" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error purchasing hearts:", error);
    res.status(500).json({ error: "Failed to purchase hearts" });
  }
});

// Purchase hearts with real money (Stripe checkout when configured)
router.post("/hearts/purchase-money", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const packageId = StripeCheckoutService.normalizeHeartsPackageId(req.body?.packageId);
    const returnPath = StripeCheckoutService.sanitizeReturnPath(req.body?.returnPath, "/settings");

    if (StripeCheckoutService.isConfigured()) {
      const checkoutSession = await StripeCheckoutService.createHeartsCheckoutSession({
        userId,
        packageId,
        baseUrl: resolveAppBaseUrl(req),
        returnPath,
      });

      return res.json({
        success: true,
        checkoutRequired: true,
        provider: "stripe",
        packageId,
        ...checkoutSession,
        message: "Redirecting to secure Stripe checkout.",
      });
    }

    const result = await UserStatsService.purchaseHeartsWithMoney(userId, packageId);

    res.json({
      ...result,
      checkoutRequired: false,
      message: `Purchase successful. ${result.heartsAdded} hearts added.`,
    });
  } catch (error) {
    if (error instanceof StripeCheckoutError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Error purchasing hearts with money:", error);
    res.status(500).json({ error: "Failed to complete hearts purchase" });
  }
});

// Purchase unlimited hearts subscription (Stripe checkout when configured)
router.post("/subscription/unlimited-hearts", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const plan = StripeCheckoutService.normalizeSubscriptionPlan(req.body?.plan);
    const returnPath = StripeCheckoutService.sanitizeReturnPath(req.body?.returnPath, "/settings");

    if (StripeCheckoutService.isConfigured()) {
      const checkoutSession = await StripeCheckoutService.createUnlimitedHeartsCheckoutSession({
        userId,
        plan,
        baseUrl: resolveAppBaseUrl(req),
        returnPath,
      });

      return res.json({
        success: true,
        checkoutRequired: true,
        provider: "stripe",
        plan,
        ...checkoutSession,
        message: "Redirecting to secure Stripe checkout.",
      });
    }

    const result = await UserStatsService.purchaseUnlimitedHeartsSubscription(userId, plan);

    res.json({
      ...result,
      checkoutRequired: false,
      message: "Unlimited hearts activated successfully",
    });
  } catch (error) {
    if (error instanceof StripeCheckoutError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Error purchasing unlimited hearts subscription:", error);
    res.status(500).json({ error: "Failed to activate unlimited hearts" });
  }
});

// Confirm Stripe checkout and fulfill purchase idempotently
router.post("/stripe/confirm", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const result = await StripeCheckoutService.confirmCheckoutSession(userId, sessionId);

    if (result.checkoutType === "hearts_package") {
      return res.json({
        ...result,
        message: result.alreadyFulfilled
          ? "Hearts purchase already confirmed."
          : `Purchase successful. ${result.heartsAdded} hearts added.`,
      });
    }

    return res.json({
      ...result,
      message: result.alreadyFulfilled
        ? "Unlimited hearts subscription already confirmed."
        : "Unlimited hearts activated successfully",
    });
  } catch (error) {
    if (error instanceof StripeCheckoutError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error confirming Stripe checkout:", error);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

// Award XP to user
router.post("/xp/award", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { amount, source, sourceId, profileId } = req.body;

    if (!amount || !source) {
      return res.status(400).json({ error: "Amount and source are required" });
    }

    const result = await UserStatsService.awardXP(
      userId,
      amount,
      source,
      sourceId,
      profileId
    );

    res.json(result);
  } catch (error) {
    console.error("Error awarding XP:", error);
    res.status(500).json({ error: "Failed to award XP" });
  }
});

export default router;
