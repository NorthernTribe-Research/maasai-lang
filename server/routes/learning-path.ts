import { Router } from "express";
import { requireAuth, getUserId } from "../middleware/auth";
import { db } from "../db";
import { curriculumService } from "../services/CurriculumService";
import { UserStatsService } from "../services/UserStatsService";
import {
  learningProfiles,
  lessons,
  userLessons,
  userUnitLegendary,
  userLanguages,
  languages
} from "@shared/schema";
import { eq, and, asc, desc } from "drizzle-orm";

const router = Router();

const LESSON_POSITIONS = ["left", "center", "right"] as const;
const LESSONS_PER_UNIT = 5;

async function getLatestProfileIdForUser(userId: string): Promise<string | null> {
  const profile = await db.query.learningProfiles.findFirst({
    where: eq(learningProfiles.userId, userId),
    orderBy: [desc(learningProfiles.lastActivityDate)]
  });

  return profile?.id || null;
}

async function resolveProfileIdForRequest(
  userId: string,
  requestedProfileId?: string | null,
): Promise<string | null> {
  const trimmedProfileId = requestedProfileId?.trim();
  if (!trimmedProfileId) {
    return getLatestProfileIdForUser(userId);
  }

  const profile = await db.query.learningProfiles.findFirst({
    where: and(
      eq(learningProfiles.id, trimmedProfileId),
      eq(learningProfiles.userId, userId),
    ),
  });

  return profile?.id || null;
}

function mapTimelineToUnits(
  targetLanguage: string,
  timelineLessons: Array<{
    id: string;
    title: string;
    state: "locked" | "available" | "in-progress" | "completed";
    estimatedDuration: number;
    timelineDay: number;
    unlockAt: string;
    isUnlockedBySchedule: boolean;
    isCompleted: boolean;
    accessMode?: "free" | "hearts" | "unlimited" | "blocked";
    heartsRequired?: number;
    dailyLimitReached?: boolean;
    availableTomorrowAt?: string;
  }>
) {
  const units: Array<{
    id: string;
    title: string;
    description: string;
    lessons: any[];
  }> = [];

  for (let index = 0; index < timelineLessons.length; index++) {
    const lesson = timelineLessons[index];
    const unitIndex = Math.floor(index / LESSONS_PER_UNIT);
    const unitNumber = unitIndex + 1;

    if (!units[unitIndex]) {
      units[unitIndex] = {
        id: `unit-${unitNumber}`,
        title: `${targetLanguage} • Week ${unitNumber}`,
        description: `Timeline progression lessons ${unitIndex * LESSONS_PER_UNIT + 1}-${Math.min((unitIndex + 1) * LESSONS_PER_UNIT, timelineLessons.length)}`,
        lessons: []
      };
    }

    const unlockLabel = new Date(lesson.unlockAt).toLocaleDateString();
    let lessonDescription = `Day ${lesson.timelineDay}`;
    if (!lesson.isUnlockedBySchedule && !lesson.isCompleted) {
      lessonDescription = `${lessonDescription} • unlocks ${unlockLabel}`;
    }
    if (lesson.accessMode === "hearts" && !lesson.isCompleted) {
      lessonDescription = `${lessonDescription} • costs ${lesson.heartsRequired || 1} ❤️ to continue today`;
    }
    if (lesson.accessMode === "blocked" && !lesson.isCompleted) {
      const freeAt = lesson.availableTomorrowAt
        ? new Date(lesson.availableTomorrowAt).toLocaleString()
        : "tomorrow";
      lessonDescription = `${lessonDescription} • daily free lessons used (free again ${freeAt})`;
    }

    const effectiveState =
      lesson.accessMode === "blocked" && (lesson.state === "available" || lesson.state === "in-progress")
        ? "locked"
        : lesson.state;
    units[unitIndex].lessons.push({
      id: lesson.id,
      title: lesson.title,
      type: effectiveState === "completed" ? "review" : "lesson",
      state: effectiveState,
      xpReward: Math.max(20, Math.round(lesson.estimatedDuration * 2)),
      position: LESSON_POSITIONS[index % LESSON_POSITIONS.length],
      icon:
        effectiveState === "completed"
          ? "✅"
          : effectiveState === "locked"
          ? "🔒"
          : lesson.accessMode === "hearts"
          ? "❤️"
          : lesson.accessMode === "unlimited"
          ? "∞"
          : "📚",
      description: lessonDescription,
      accessMode: lesson.accessMode || "free",
      heartsRequired: lesson.heartsRequired || 0,
      dailyLimitReached: lesson.dailyLimitReached || false,
      availableTomorrowAt: lesson.availableTomorrowAt || null,
    });
  }

  return units;
}

function hasActiveLegendarySubscription(stats: {
  isPremium: boolean;
  unlimitedHearts: boolean;
  premiumExpiresAt: Date | string | null;
}): boolean {
  if (!stats.isPremium || !stats.unlimitedHearts) {
    return false;
  }

  if (!stats.premiumExpiresAt) {
    return true;
  }

  return new Date(stats.premiumExpiresAt).getTime() > Date.now();
}

async function decorateUnitsWithLegendary(
  userId: string,
  units: Array<{ id: string; lessons: Array<{ state: string; type?: string }> }>
) {
  const stats = await UserStatsService.getUserStats(userId);
  if (!stats) {
    return units;
  }

  const gemCost = UserStatsService.getLegendaryGemCost();
  const hasUnlimitedLegendary = hasActiveLegendarySubscription({
    isPremium: stats.isPremium,
    unlimitedHearts: stats.unlimitedHearts,
    premiumExpiresAt: stats.premiumExpiresAt,
  });

  const legendaryRows = await db
    .select({ unitId: userUnitLegendary.unitId })
    .from(userUnitLegendary)
    .where(eq(userUnitLegendary.userId, userId));
  const legendarySet = new Set(legendaryRows.map((row) => row.unitId));

  return units.map((unit) => {
    const isLegendary = legendarySet.has(unit.id);
    const totalLessons = unit.lessons.length;
    const completedLessons = unit.lessons.filter(
      (lesson) => lesson.state === "completed" || lesson.state === "legendary"
    ).length;
    const legendaryEligible = totalLessons > 0 && completedLessons === totalLessons;
    const canSpendGems = stats.gems >= gemCost;
    const canAttemptLegendary =
      isLegendary || (legendaryEligible && (hasUnlimitedLegendary || canSpendGems));

    const legendaryAccessMode = isLegendary
      ? "completed"
      : hasUnlimitedLegendary
      ? "unlimited"
      : canSpendGems
      ? "gems"
      : "blocked";

    return {
      ...unit,
      lessons: isLegendary
        ? unit.lessons.map((lesson) =>
            lesson.state === "completed"
              ? { ...lesson, state: "legendary", type: "legendary" }
              : lesson
          )
        : unit.lessons,
      legendaryEligible,
      isLegendary,
      canAttemptLegendary,
      legendaryAccessMode,
      legendaryGemCost: gemCost,
      gemsBalance: stats.gems,
      gemsRequired: Math.max(0, gemCost - stats.gems),
      hasUnlimitedLegendary,
    };
  });
}

async function getUnitLegendaryEligibility(
  userId: string,
  unitId: string
): Promise<{ exists: boolean; eligible: boolean; isLegendary: boolean }> {
  const [legendaryRow] = await db
    .select({ id: userUnitLegendary.id })
    .from(userUnitLegendary)
    .where(
      and(
        eq(userUnitLegendary.userId, userId),
        eq(userUnitLegendary.unitId, unitId),
      ),
    );

  const isLegendary = !!legendaryRow;

  const latestProfileId = await getLatestProfileIdForUser(userId);
  if (latestProfileId) {
    const timeline = await curriculumService.getLessonTimeline(latestProfileId);
    if (timeline.lessons.length > 0) {
      const timelineUnits = mapTimelineToUnits(timeline.targetLanguage, timeline.lessons);
      const matchedTimelineUnit = timelineUnits.find((unit) => unit.id === unitId);
      if (matchedTimelineUnit) {
        const eligible = matchedTimelineUnit.lessons.length > 0 &&
          matchedTimelineUnit.lessons.every(
            (lesson) => lesson.state === "completed" || lesson.state === "legendary"
          );
        return { exists: true, eligible, isLegendary };
      }
    }
  }

  const levelMatch = /^unit-(\d+)$/.exec(unitId);
  if (!levelMatch) {
    return { exists: false, eligible: false, isLegendary };
  }

  const level = Number(levelMatch[1]);
  if (!Number.isFinite(level)) {
    return { exists: false, eligible: false, isLegendary };
  }

  const enrollments = await db
    .select({ userLanguage: userLanguages, language: languages })
    .from(userLanguages)
    .innerJoin(languages, eq(userLanguages.languageId, languages.id))
    .where(and(eq(userLanguages.userId, userId), eq(userLanguages.isActive, true)));
  if (enrollments.length === 0) {
    return { exists: false, eligible: false, isLegendary };
  }

  const languageId = enrollments[0].language.id;
  const unitLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.languageId, languageId), eq(lessons.level, level)));
  if (unitLessons.length === 0) {
    return { exists: false, eligible: false, isLegendary };
  }

  const lessonIds = unitLessons.map((lesson) => lesson.id);
  const completionRows = await db
    .select({ lessonId: userLessons.lessonId, isCompleted: userLessons.isCompleted })
    .from(userLessons)
    .where(eq(userLessons.userId, userId));
  const completionMap = new Map(completionRows.map((row) => [row.lessonId, row.isCompleted]));
  const eligible = lessonIds.every((lessonId) => completionMap.get(lessonId) === true);

  return { exists: true, eligible, isLegendary };
}

// Get timeline metadata for the user's active AI curriculum
router.get("/timeline", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const requestedProfileId = typeof req.query.profileId === "string" ? req.query.profileId : null;
    const profileId = await resolveProfileIdForRequest(userId, requestedProfileId);

    if (requestedProfileId && !profileId) {
      return res.status(403).json({ message: "Requested profile is not available for this user" });
    }

    if (!profileId) {
      return res.status(404).json({ message: "No active learning profile found" });
    }

    const timeline = await curriculumService.getLessonTimeline(profileId);
    const nextScheduledUnlock = timeline.lessons.find(
      (lesson) => !lesson.isCompleted && !lesson.isUnlockedBySchedule
    );

    return res.json({
      ...timeline,
      nextScheduledUnlockAt: nextScheduledUnlock?.unlockAt || null
    });
  } catch (error) {
    console.error("Error fetching learning timeline:", error);
    return res.status(500).json({ message: "Failed to fetch learning timeline" });
  }
});

router.get("/lesson-access/:lessonId", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { lessonId } = req.params;
    const lessonGate = await UserStatsService.getDailyLessonGate(userId);
    const profileIdFromQuery = typeof req.query.profileId === "string" ? req.query.profileId : null;

    if (lessonId.includes("-")) {
      const profileId = await resolveProfileIdForRequest(userId, profileIdFromQuery);
      if (profileIdFromQuery && !profileId) {
        return res.status(403).json({ message: "Requested profile is not available for this user" });
      }
      if (!profileId) {
        return res.status(404).json({ message: "No active learning profile found" });
      }

      const timeline = await curriculumService.getLessonTimeline(profileId);
      const timelineLesson = timeline.lessons.find((lesson) => lesson.id === lessonId);
      if (!timelineLesson) {
        return res.status(404).json({ message: "Lesson not found in current timeline" });
      }

      if (timelineLesson.accessMode === "blocked") {
        return res.status(402).json({
          canStart: false,
          reason: "daily_limit_reached",
          accessMode: "blocked",
          heartsRequired: timelineLesson.heartsRequired || lessonGate.heartsPerExtraLesson,
          hearts: lessonGate.hearts,
          freeLessonsPerDay: lessonGate.freeLessonsPerDay,
          lessonsCompletedToday: lessonGate.completedLessonsToday,
          remainingFreeLessons: lessonGate.remainingFreeLessons,
          nextFreeLessonAt: timelineLesson.availableTomorrowAt || lessonGate.nextFreeLessonAt,
          message: "Daily free lessons are finished. Use hearts or wait for tomorrow.",
        });
      }

      if (timelineLesson.state === "locked") {
        return res.status(403).json({
          canStart: false,
          reason: "lesson_locked",
          accessMode: timelineLesson.accessMode || "free",
          heartsRequired: timelineLesson.heartsRequired || 0,
          nextFreeLessonAt: timelineLesson.availableTomorrowAt || null,
          message: "This lesson is still locked. Complete prerequisites or wait for schedule unlock.",
        });
      }

      return res.json({
        canStart: true,
        reason: "ok",
        accessMode: timelineLesson.accessMode || "free",
        heartsRequired: timelineLesson.heartsRequired || 0,
        hearts: lessonGate.hearts,
        freeLessonsPerDay: lessonGate.freeLessonsPerDay,
        lessonsCompletedToday: lessonGate.completedLessonsToday,
        remainingFreeLessons: lessonGate.remainingFreeLessons,
        nextFreeLessonAt: lessonGate.nextFreeLessonAt,
        message: "Lesson available",
      });
    }

    const numericLessonId = Number.parseInt(lessonId, 10);
    if (!Number.isFinite(numericLessonId)) {
      return res.status(400).json({ message: "Invalid lesson id" });
    }

    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, numericLessonId),
    });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const orderedLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.languageId, lesson.languageId))
      .orderBy(asc(lessons.level), asc(lessons.order));

    const lessonIndex = orderedLessons.findIndex((item) => item.id === numericLessonId);
    if (lessonIndex === -1) {
      return res.status(404).json({ message: "Lesson not found in language sequence" });
    }

    const completionRecords = await db
      .select()
      .from(userLessons)
      .where(eq(userLessons.userId, userId));
    const completionMap = new Map(completionRecords.map((record) => [record.lessonId, record]));

    const previousLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1] : null;
    const prerequisiteMet = previousLesson ? completionMap.get(previousLesson.id)?.isCompleted ?? false : true;
    if (!prerequisiteMet) {
      return res.status(403).json({
        canStart: false,
        reason: "lesson_locked",
        accessMode: "blocked",
        heartsRequired: 0,
        message: "Complete the previous lesson to unlock this one.",
      });
    }

    if (!lessonGate.hasUnlimitedHearts && lessonGate.remainingFreeLessons <= 0) {
      if (lessonGate.hearts < lessonGate.heartsPerExtraLesson) {
        return res.status(402).json({
          canStart: false,
          reason: "daily_limit_reached",
          accessMode: "blocked",
          heartsRequired: lessonGate.heartsPerExtraLesson,
          hearts: lessonGate.hearts,
          freeLessonsPerDay: lessonGate.freeLessonsPerDay,
          lessonsCompletedToday: lessonGate.completedLessonsToday,
          remainingFreeLessons: lessonGate.remainingFreeLessons,
          nextFreeLessonAt: lessonGate.nextFreeLessonAt,
          message: "Daily free lessons are finished. Use hearts or wait for tomorrow.",
        });
      }

      return res.json({
        canStart: true,
        reason: "ok",
        accessMode: "hearts",
        heartsRequired: lessonGate.heartsPerExtraLesson,
        hearts: lessonGate.hearts,
        freeLessonsPerDay: lessonGate.freeLessonsPerDay,
        lessonsCompletedToday: lessonGate.completedLessonsToday,
        remainingFreeLessons: lessonGate.remainingFreeLessons,
        nextFreeLessonAt: lessonGate.nextFreeLessonAt,
        message: `${lessonGate.heartsPerExtraLesson} heart will be used on completion.`,
      });
    }

    return res.json({
      canStart: true,
      reason: "ok",
      accessMode: lessonGate.hasUnlimitedHearts ? "unlimited" : "free",
      heartsRequired: 0,
      hearts: lessonGate.hearts,
      freeLessonsPerDay: lessonGate.freeLessonsPerDay,
      lessonsCompletedToday: lessonGate.completedLessonsToday,
      remainingFreeLessons: lessonGate.remainingFreeLessons,
      nextFreeLessonAt: lessonGate.nextFreeLessonAt,
      message: "Lesson available",
    });
  } catch (error) {
    console.error("Error checking lesson access:", error);
    return res.status(500).json({ message: "Failed to check lesson access" });
  }
});

router.get("/legendary/access/:unitId", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const unitId = String(req.params.unitId || "").trim();
    if (!unitId) {
      return res.status(400).json({ message: "Unit id is required" });
    }

    const eligibility = await getUnitLegendaryEligibility(userId, unitId);
    if (!eligibility.exists) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const access = await UserStatsService.getLegendaryAttemptAccess(userId, unitId);
    const canAttempt = access.isLegendary || (eligibility.eligible && access.canAttempt);

    return res.json({
      ...access,
      legendaryEligible: eligibility.eligible,
      canAttempt,
      message: !eligibility.eligible && !access.isLegendary
        ? "Complete all lessons in this unit before attempting legendary."
        : access.message,
    });
  } catch (error) {
    console.error("Error checking legendary access:", error);
    return res.status(500).json({ message: "Failed to check legendary access" });
  }
});

router.post("/legendary/attempt", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const unitId = String(req.body?.unitId || "").trim();
    if (!unitId) {
      return res.status(400).json({ message: "Unit id is required" });
    }

    const eligibility = await getUnitLegendaryEligibility(userId, unitId);
    if (!eligibility.exists) {
      return res.status(404).json({ message: "Unit not found" });
    }

    if (!eligibility.eligible && !eligibility.isLegendary) {
      return res.status(403).json({
        code: "LEGENDARY_UNIT_NOT_ELIGIBLE",
        message: "Complete all lessons in this unit before attempting legendary.",
      });
    }

    const result = await UserStatsService.attemptLegendaryUnit(userId, unitId);
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode;
    if (statusCode === 402 || statusCode === 403) {
      return res.status(statusCode).json({
        message: error instanceof Error ? error.message : "Legendary access restricted",
        code: (error as any)?.code || "LEGENDARY_ACCESS_RESTRICTED",
        details: (error as any)?.details || null,
      });
    }

    console.error("Error attempting legendary unit:", error);
    return res.status(500).json({ message: "Failed to start legendary attempt" });
  }
});

// Get user's learning path with lessons organized into units
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const lessonGate = await UserStatsService.getDailyLessonGate(userId);

    // Prefer AI curriculum timeline progression when a learning profile exists
    const requestedProfileId = typeof req.query.profileId === "string" ? req.query.profileId : null;
    const resolvedProfileId = await resolveProfileIdForRequest(userId, requestedProfileId);
    if (requestedProfileId && !resolvedProfileId) {
      return res.status(403).json({ message: "Requested profile is not available for this user" });
    }

    if (resolvedProfileId) {
      const timeline = await curriculumService.getLessonTimeline(resolvedProfileId);
      if (timeline.lessons.length > 0) {
        const timelineUnits = mapTimelineToUnits(
          timeline.targetLanguage,
          timeline.lessons
        );
        const decoratedTimelineUnits = await decorateUnitsWithLegendary(userId, timelineUnits as any);
        return res.json(decoratedTimelineUnits);
      }
    }

    // Legacy fallback: static lessons progression
    const enrollments = await db
      .select({
        userLanguage: userLanguages,
        language: languages,
      })
      .from(userLanguages)
      .innerJoin(languages, eq(userLanguages.languageId, languages.id))
      .where(and(eq(userLanguages.userId, userId), eq(userLanguages.isActive, true)));

    if (enrollments.length === 0) {
      return res.json([]);
    }

    const primaryEnrollment = enrollments[0];
    const languageId = primaryEnrollment.language.id;

    const allLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.languageId, languageId))
      .orderBy(asc(lessons.level), asc(lessons.order));

    if (allLessons.length === 0) {
      return res.json([]);
    }

    const completedLessons = await db
      .select()
      .from(userLessons)
      .where(eq(userLessons.userId, userId));

    const completedMap = new Map(
      completedLessons.map((ul) => [ul.lessonId, ul])
    );

    const unitsMap = new Map<number, {
      id: string;
      title: string;
      description: string;
      lessons: any[];
    }>();

    const levelNames: Record<number, { title: string; description: string }> = {
      1: { title: "Basics", description: "Foundations & greetings" },
      2: { title: "Elementary", description: "Everyday vocabulary & grammar" },
      3: { title: "Intermediate", description: "Conversations & culture" },
      4: { title: "Advanced", description: "Complex topics & fluency" },
      5: { title: "Expert", description: "Native-level proficiency" },
    };

    for (let index = 0; index < allLessons.length; index++) {
      const lesson = allLessons[index];
      const level = lesson.level;

      if (!unitsMap.has(level)) {
        const levelInfo = levelNames[level] || {
          title: `Level ${level}`,
          description: `Level ${level} lessons`,
        };
        unitsMap.set(level, {
          id: `unit-${level}`,
          title: `${primaryEnrollment.language.flag} ${primaryEnrollment.language.name}: ${levelInfo.title}`,
          description: levelInfo.description,
          lessons: [],
        });
      }

      const unit = unitsMap.get(level)!;
      const userLesson = completedMap.get(lesson.id);
      const isCompleted = userLesson?.isCompleted ?? false;
      const previousLesson = index > 0 ? allLessons[index - 1] : null;
      const previousCompleted = previousLesson
        ? completedMap.get(previousLesson.id)?.isCompleted ?? false
        : true;

      let state: "locked" | "available" | "in-progress" | "completed" =
        isCompleted ? "completed" : previousCompleted ? "available" : "locked";
      const requiresHearts =
        state === "available" &&
        !isCompleted &&
        !lessonGate.hasUnlimitedHearts &&
        lessonGate.remainingFreeLessons <= 0 &&
        lessonGate.hearts >= lessonGate.heartsPerExtraLesson;
      const shouldBlockByDailyLimit =
        state === "available" &&
        !isCompleted &&
        !lessonGate.hasUnlimitedHearts &&
        lessonGate.remainingFreeLessons <= 0 &&
        lessonGate.hearts < lessonGate.heartsPerExtraLesson;

      if (shouldBlockByDailyLimit) {
        state = "locked";
      }

      const dailyMessage =
        requiresHearts
          ? `Costs ${lessonGate.heartsPerExtraLesson} ❤️ to continue today`
          : shouldBlockByDailyLimit
          ? `Daily free lessons used. Free again ${new Date(lessonGate.nextFreeLessonAt).toLocaleString()}`
          : "";
      const description = [lesson.description, dailyMessage].filter(Boolean).join(" • ");

      unit.lessons.push({
        id: String(lesson.id),
        title: lesson.title,
        type: lesson.type || "lesson",
        state,
        xpReward: lesson.xpReward,
        position: LESSON_POSITIONS[index % LESSON_POSITIONS.length],
        icon: state === "locked" ? "🔒" : requiresHearts ? "❤️" : lesson.icon || "📚",
        description,
        accessMode: requiresHearts ? "hearts" : shouldBlockByDailyLimit ? "blocked" : lessonGate.hasUnlimitedHearts ? "unlimited" : "free",
        heartsRequired: requiresHearts ? lessonGate.heartsPerExtraLesson : 0,
        dailyLimitReached: shouldBlockByDailyLimit || requiresHearts,
        availableTomorrowAt: shouldBlockByDailyLimit ? lessonGate.nextFreeLessonAt : null,
      });
    }

    const legacyUnits = Array.from(unitsMap.values());
    const decoratedLegacyUnits = await decorateUnitsWithLegendary(userId, legacyUnits as any);
    return res.json(decoratedLegacyUnits);
  } catch (error) {
    console.error("Error fetching learning path:", error);
    return res.status(500).json({ message: "Failed to fetch learning path" });
  }
});

export default router;
