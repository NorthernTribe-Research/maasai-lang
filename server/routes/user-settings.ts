import { Router, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { getUserId, requireAuth } from "../middleware/auth";
import { userConsentEvents, userSettings, users } from "../../shared/schema";
import { toSafeUser } from "../utils/userResponse";

const router = Router();
const CURRENT_CONSENT_VERSION = process.env.CONSENT_VERSION?.trim() || "2026.03";

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  pushNotifications: false,
  weeklyReport: true,
  achievementAlerts: true,
  streakReminders: true,
  practiceReminders: true,
  dataSharing: false,
  profileVisibility: "public",
  showProgress: true,
  showStreak: true,
  termsAccepted: false,
  privacyAccepted: false,
  personalizationConsent: false,
  analyticsConsent: false,
  crashDiagnosticsConsent: true,
  microphonePermissionGranted: false,
  notificationsPermissionGranted: false,
  consentVersion: CURRENT_CONSENT_VERSION,
  consentUpdatedAt: null as Date | null,
};

const userSettingsPatchSchema = z
  .object({
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    weeklyReport: z.boolean(),
    achievementAlerts: z.boolean(),
    streakReminders: z.boolean(),
    practiceReminders: z.boolean(),
    dataSharing: z.boolean(),
    profileVisibility: z.enum(["public", "friends", "private"]),
    showProgress: z.boolean(),
    showStreak: z.boolean(),
    termsAccepted: z.boolean(),
    privacyAccepted: z.boolean(),
    personalizationConsent: z.boolean(),
    analyticsConsent: z.boolean(),
    crashDiagnosticsConsent: z.boolean(),
    microphonePermissionGranted: z.boolean(),
    notificationsPermissionGranted: z.boolean(),
    consentVersion: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[A-Za-z0-9._-]+$/),
  })
  .partial()
  .strict();

const userProfilePatchSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    email: z.string().trim().email().max(160).optional(),
  })
  .strict();

const CONSENT_AUDIT_KEYS = new Set([
  "termsAccepted",
  "privacyAccepted",
  "dataSharing",
  "personalizationConsent",
  "analyticsConsent",
  "crashDiagnosticsConsent",
  "microphonePermissionGranted",
  "notificationsPermissionGranted",
  "consentVersion",
]);

const TARGETING_RELATED_KEYS = ["personalizationConsent", "analyticsConsent", "dataSharing"] as const;

function normalizeUserSettingsForComparison(settings: Partial<typeof DEFAULT_SETTINGS> | null) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
  };
}

function extractUserIdOrReject(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  return userId;
}

function requestSource(req: Request): string {
  const sourceHeader = req.header("x-client-platform")?.trim();
  if (sourceHeader) {
    const normalized = sourceHeader.toLowerCase();
    const allowedSources = new Set(["android", "web", "ios", "api"]);
    if (allowedSources.has(normalized)) {
      return normalized;
    }
  }

  const ua = req.header("user-agent")?.toLowerCase() ?? "";
  if (ua.includes("okhttp") || ua.includes("android")) return "android";
  if (ua.includes("mozilla")) return "web";
  return "api";
}

function requestIp(req: Request): string | null {
  return req.ip ? req.ip.slice(0, 64) : null;
}

function parseValidationErrors(validationError: z.ZodError): string[] {
  return validationError.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

function hasTargetingConsentEnabled(effectiveSettings: Record<string, unknown>): boolean {
  return TARGETING_RELATED_KEYS.some((key) => effectiveSettings[key] === true);
}

// Get user settings
router.get("/user/settings", requireAuth, async (req, res) => {
  const userId = extractUserIdOrReject(req, res);
  if (!userId) return;

  try {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!settings) {
      return res.json(DEFAULT_SETTINGS);
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/user/consent-events", requireAuth, async (req, res) => {
  const userId = extractUserIdOrReject(req, res);
  if (!userId) return;

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

  try {
    const events = await db
      .select()
      .from(userConsentEvents)
      .where(eq(userConsentEvents.userId, userId))
      .orderBy(desc(userConsentEvents.createdAt))
      .limit(limit);

    res.json(events);
  } catch (error) {
    console.error("Error fetching consent events:", error);
    res.status(500).json({ message: "Failed to fetch consent events" });
  }
});

// Update user settings
router.patch("/user/settings", requireAuth, async (req, res) => {
  const userId = extractUserIdOrReject(req, res);
  if (!userId) return;

  try {
    const parsed = userSettingsPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid settings payload",
        errors: parseValidationErrors(parsed.error),
      });
    }

    const updates = { ...parsed.data };
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid settings to update" });
    }

    if ("consentVersion" in updates) {
      updates.consentVersion = CURRENT_CONSENT_VERSION;
    }

    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const baselineSettings = normalizeUserSettingsForComparison(existingSettings ?? null);
    const effectiveSettings = {
      ...baselineSettings,
      ...updates,
    };

    if (
      hasTargetingConsentEnabled(effectiveSettings) &&
      (!effectiveSettings.termsAccepted || !effectiveSettings.privacyAccepted)
    ) {
      return res.status(400).json({
        message: "Terms and Privacy acceptance required",
        errors: [
          "Accept Terms of Service and Privacy Policy before enabling data targeting or analytics.",
        ],
      });
    }

    const changedConsentEntries = Object.entries(updates).filter(([key, value]) => {
      if (!CONSENT_AUDIT_KEYS.has(key)) return false;
      return baselineSettings[key as keyof typeof baselineSettings] !== value;
    });

    if (changedConsentEntries.length > 0 && !("consentVersion" in updates)) {
      updates.consentVersion = CURRENT_CONSENT_VERSION;
    }

    const settingsPayload: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date(),
    };

    if (changedConsentEntries.length > 0) {
      settingsPayload.consentUpdatedAt = new Date();
    }

    const updatedSettings = await db.transaction(async (tx) => {
      let result;

      if (existingSettings) {
        [result] = await tx
          .update(userSettings)
          .set(settingsPayload)
          .where(eq(userSettings.userId, userId))
          .returning();
      } else {
        [result] = await tx
          .insert(userSettings)
          .values({
            userId,
            ...settingsPayload,
          })
          .returning();
      }

      if (changedConsentEntries.length > 0) {
        const previousValues = Object.fromEntries(
          changedConsentEntries.map(([key]) => [key, baselineSettings[key as keyof typeof baselineSettings]]),
        );
        const newValues = Object.fromEntries(changedConsentEntries);

        const resolvedConsentVersion =
          typeof effectiveSettings.consentVersion === "string"
            ? effectiveSettings.consentVersion
            : CURRENT_CONSENT_VERSION;

        await tx.insert(userConsentEvents).values({
          userId,
          eventType: "consent_update",
          changedKeys: changedConsentEntries.map(([key]) => key),
          previousValues,
          newValues,
          consentVersion: resolvedConsentVersion,
          source: requestSource(req),
          ipAddress: requestIp(req),
          userAgent: req.header("user-agent")?.slice(0, 512) ?? null,
        });
      }

      return result;
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// Update user profile
router.patch("/user/profile", requireAuth, async (req, res) => {
  const userId = extractUserIdOrReject(req, res);
  if (!userId) return;

  try {
    const parsed = userProfilePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid profile payload",
        errors: parseValidationErrors(parsed.error),
      });
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No profile fields to update" });
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    res.json(toSafeUser(updatedUser));
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
