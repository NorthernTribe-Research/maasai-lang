import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { curriculumService } from "./CurriculumService";
import { db } from "../db";
import { users, learningProfiles, curricula, enhancedLessons, lessonCompletions, xpGains } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { aiServiceMonitor } from "./AIServiceMonitor";

/**
 * Integration tests for curriculum flow
 * Requirements: 3.1, 5.1, 5.6
 */
describe("Curriculum Flow Integration Tests", () => {
  let testUserId: string;
  let testProfileId: string;
  let testCurriculumId: string;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      username: `testuser_${Date.now()}`,
      password: "hashed_password",
      email: `test_${Date.now()}@example.com`,
      xp: 0,
      streak: 0,
      hearts: 5,
      maxHearts: 5,
      level: 1,
      longestStreak: 0,
      lastActive: new Date(),
      streakUpdatedAt: new Date(),
      createdAt: new Date()
    }).returning();

    testUserId = user.id;

    // Create test learning profile
    const [profile] = await db.insert(learningProfiles).values({
      userId: testUserId,
      targetLanguage: "Spanish",
      nativeLanguage: "English",
      proficiencyLevel: "Beginner",
      currentXP: 0,
      lessonsCompleted: 0,
      lastActivityDate: new Date(),
      createdAt: new Date()
    }).returning();

    testProfileId = profile.id;

    // Mock AI service to return predictable curriculum
    vi.spyOn(aiServiceMonitor, "generateCurriculumWithFallback").mockResolvedValue({
      curriculum: {
        lessons: [
          {
            title: "Greetings and Introductions",
            orderIndex: 1,
            vocabulary: [
              { word: "Hola", translation: "Hello", pronunciation: "OH-lah" }
            ],
            grammar: [
              { concept: "Basic greetings", explanation: "How to say hello in Spanish" }
            ],
            culturalContent: [
              { topic: "Spanish greetings", content: "Cultural context for greetings" }
            ],
            estimatedDuration: 30
          },
          {
            title: "Numbers 1-10",
            orderIndex: 2,
            vocabulary: [
              { word: "Uno", translation: "One", pronunciation: "OO-noh" }
            ],
            grammar: [
              { concept: "Counting", explanation: "How to count in Spanish" }
            ],
            culturalContent: [],
            estimatedDuration: 25
          },
          {
            title: "Colors",
            orderIndex: 3,
            vocabulary: [
              { word: "Rojo", translation: "Red", pronunciation: "ROH-hoh" }
            ],
            grammar: [],
            culturalContent: [],
            estimatedDuration: 20
          }
        ]
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testProfileId) {
      await db.delete(lessonCompletions).where(eq(lessonCompletions.profileId, testProfileId));
      await db.delete(enhancedLessons).where(eq(enhancedLessons.curriculumId, testCurriculumId));
      await db.delete(curricula).where(eq(curricula.profileId, testProfileId));
      await db.delete(learningProfiles).where(eq(learningProfiles.id, testProfileId));
    }
    if (testUserId) {
      await db.delete(xpGains).where(eq(xpGains.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }

    vi.restoreAllMocks();
  });

  describe("Curriculum Generation for All Languages", () => {
    it("should generate curriculum for Spanish", async () => {
      const curriculum = await curriculumService.generateLearningPath({
        profileId: testProfileId,
        targetLanguage: "Spanish",
        nativeLanguage: "English"
      });

      testCurriculumId = curriculum.id;

      expect(curriculum).toBeDefined();
      expect(curriculum.profileId).toBe(testProfileId);
      expect(curriculum.targetLanguage).toBe("Spanish");
      expect(Array.isArray(curriculum.lessons)).toBe(true);
      expect(curriculum.lessons.length).toBeGreaterThan(0);
    });

    it("should generate curriculum for Mandarin", async () => {
      // Update profile to Mandarin
      await db.update(learningProfiles)
        .set({ targetLanguage: "Mandarin" })
        .where(eq(learningProfiles.id, testProfileId));

      const curriculum = await curriculumService.generateLearningPath({
        profileId: testProfileId,
        targetLanguage: "Mandarin",
        nativeLanguage: "English"
      });

      testCurriculumId = curriculum.id;

      expect(curriculum).toBeDefined();
      expect(curriculum.targetLanguage).toBe("Mandarin");
      expect(curriculum.lessons.length).toBeGreaterThan(0);
    });

    it("should generate curriculum for Arabic", async () => {
      await db.update(learningProfiles)
        .set({ targetLanguage: "Arabic" })
        .where(eq(learningProfiles.id, testProfileId));

      const curriculum = await curriculumService.generateLearningPath({
        profileId: testProfileId,
        targetLanguage: "Arabic",
        nativeLanguage: "English"
      });

      testCurriculumId = curriculum.id;

      expect(curriculum).toBeDefined();
      expect(curriculum.targetLanguage).toBe("Arabic");
    });

    it("should generate curriculum for Hindi", async () => {
      await db.update(learningProfiles)
        .set({ targetLanguage: "Hindi" })
        .where(eq(learningProfiles.id, testProfileId));

      const curriculum = await curriculumService.generateLearningPath({
        profileId: testProfileId,
        targetLanguage: "Hindi",
        nativeLanguage: "English"
      });

      testCurriculumId = curriculum.id;

      expect(curriculum).toBeDefined();
      expect(curriculum.targetLanguage).toBe("Hindi");
    });

    it("should generate at least 10 lessons per proficiency level", async () => {
      // Mock to return 10+ lessons
      vi.spyOn(aiServiceMonitor, "generateCurriculumWithFallback").mockResolvedValue({
        curriculum: {
          lessons: Array.from({ length: 12 }, (_, i) => ({
            title: `Lesson ${i + 1}`,
            orderIndex: i + 1,
            vocabulary: [],
            grammar: [],
            culturalContent: [],
            estimatedDuration: 30
          }))
        }
      });

      const curriculum = await curriculumService.generateLearningPath({
        profileId: testProfileId,
        targetLanguage: "Spanish",
        nativeLanguage: "English"
      });

      testCurriculumId = curriculum.id;

      expect(curriculum.lessons.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Lesson Progression Based on Proficiency", () => {
    beforeEach(async () => {
      // Generate curriculum for testing
      const curriculum = await curriculumService.generateLearningPath({
        profileId: testProfileId,
        targetLanguage: "Spanish",
        nativeLanguage: "English"
      });
      testCurriculumId = curriculum.id;
    });

    it("should return first lesson for beginner profile", async () => {
      const nextLesson = await curriculumService.getNextLesson(testProfileId);

      expect(nextLesson).toBeDefined();
      expect(nextLesson?.title).toBe("Greetings and Introductions");
      expect(nextLesson?.orderIndex).toBe(1);
    });

    it("should progress to next lesson after completion", async () => {
      // Get first lesson
      const firstLesson = await curriculumService.getNextLesson(testProfileId);
      expect(firstLesson).toBeDefined();

      // Complete first lesson
      await curriculumService.markLessonComplete({
        lessonId: firstLesson!.id,
        profileId: testProfileId,
        metrics: {
          accuracy: 0.9,
          completionTime: 1800,
          errorsCount: 2,
          errorPatterns: []
        }
      });

      // Get next lesson - should be second lesson
      const secondLesson = await curriculumService.getNextLesson(testProfileId);
      expect(secondLesson).toBeDefined();
      expect(secondLesson?.title).toBe("Numbers 1-10");
      expect(secondLesson?.orderIndex).toBe(2);
    });

    it("should track lesson completion order", async () => {
      const lessons = await db.query.enhancedLessons.findMany({
        where: eq(enhancedLessons.curriculumId, testCurriculumId)
      });

      // Complete lessons in order
      for (let i = 0; i < Math.min(2, lessons.length); i++) {
        await curriculumService.markLessonComplete({
          lessonId: lessons[i].id,
          profileId: testProfileId,
          metrics: {
            accuracy: 0.85,
            completionTime: 1500,
            errorsCount: 3,
            errorPatterns: []
          }
        });
      }

      // Check completion history
      const history = await curriculumService.getLessonHistory(testProfileId);
      expect(history.length).toBe(2);
      expect(history[0].lesson.orderIndex).toBeGreaterThan(history[1].lesson.orderIndex);
    });

    it("should return null when all lessons completed", async () => {
      const lessons = await db.query.enhancedLessons.findMany({
        where: eq(enhancedLessons.curriculumId, testCurriculumId)
      });

      // Complete all lessons
      for (const lesson of lessons) {
        await curriculumService.markLessonComplete({
          lessonId: lesson.id,
          profileId: testProfileId,
          metrics: {
            accuracy: 0.9,
            completionTime: 1800,
            errorsCount: 1,
            errorPatterns: []
          }
        });
      }

      // Should return null when all completed
      const nextLesson = await curriculumService.getNextLesson(testProfileId);
      expect(nextLesson).toBeNull();
    });
  });

  describe("Lesson Completion and XP Award", () => {
    let testLessonId: string;

    beforeEach(async () => {
      const curriculum = await curriculumService.generateLearningPath({
        profileId: testProfileId,
        targetLanguage: "Spanish",
        nativeLanguage: "English"
      });
      testCurriculumId = curriculum.id;

      const lesson = await curriculumService.getNextLesson(testProfileId);
      testLessonId = lesson!.id;
    });

    it("should award XP on lesson completion", async () => {
      const result = await curriculumService.markLessonComplete({
        lessonId: testLessonId,
        profileId: testProfileId,
        metrics: {
          accuracy: 0.9,
          completionTime: 1800,
          errorsCount: 2,
          errorPatterns: []
        }
      });

      expect(result.xpAwarded).toBeGreaterThan(0);
      expect(result.profileUpdates.currentXP).toBeGreaterThan(0);
    });

    it("should award bonus XP for high accuracy", async () => {
      const highAccuracyResult = await curriculumService.markLessonComplete({
        lessonId: testLessonId,
        profileId: testProfileId,
        metrics: {
          accuracy: 1.0, // Perfect accuracy
          completionTime: 1500,
          errorsCount: 0,
          errorPatterns: []
        }
      });

      // Base XP is 100, accuracy bonus is up to 50
      expect(highAccuracyResult.xpAwarded).toBeGreaterThanOrEqual(100);
      expect(highAccuracyResult.xpAwarded).toBeLessThanOrEqual(150);
    });

    it("should record lesson completion in database", async () => {
      await curriculumService.markLessonComplete({
        lessonId: testLessonId,
        profileId: testProfileId,
        metrics: {
          accuracy: 0.85,
          completionTime: 2000,
          errorsCount: 3,
          errorPatterns: ["verb_conjugation"]
        }
      });

      const completion = await db.query.lessonCompletions.findFirst({
        where: eq(lessonCompletions.lessonId, testLessonId)
      });

      expect(completion).toBeDefined();
      expect(completion?.profileId).toBe(testProfileId);
      expect(completion?.xpAwarded).toBeGreaterThan(0);
    });

    it("should update profile XP after completion", async () => {
      const profileBefore = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, testProfileId)
      });

      const result = await curriculumService.markLessonComplete({
        lessonId: testLessonId,
        profileId: testProfileId,
        metrics: {
          accuracy: 0.9,
          completionTime: 1800,
          errorsCount: 2,
          errorPatterns: []
        }
      });

      const profileAfter = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, testProfileId)
      });

      expect(profileAfter?.currentXP).toBe((profileBefore?.currentXP || 0) + result.xpAwarded);
    });

    it("should record XP gain in xp_gains table", async () => {
      await curriculumService.markLessonComplete({
        lessonId: testLessonId,
        profileId: testProfileId,
        metrics: {
          accuracy: 0.9,
          completionTime: 1800,
          errorsCount: 2,
          errorPatterns: []
        }
      });

      const xpGain = await db.query.xpGains.findFirst({
        where: eq(xpGains.sourceId, testLessonId)
      });

      expect(xpGain).toBeDefined();
      expect(xpGain?.source).toBe("lesson");
      expect(xpGain?.amount).toBeGreaterThan(0);
    });

    it("should not award XP for duplicate completion", async () => {
      // Complete lesson first time
      const firstResult = await curriculumService.markLessonComplete({
        lessonId: testLessonId,
        profileId: testProfileId,
        metrics: {
          accuracy: 0.9,
          completionTime: 1800,
          errorsCount: 2,
          errorPatterns: []
        }
      });

      expect(firstResult.xpAwarded).toBeGreaterThan(0);

      // Try to complete again
      const secondResult = await curriculumService.markLessonComplete({
        lessonId: testLessonId,
        profileId: testProfileId,
        metrics: {
          accuracy: 0.95,
          completionTime: 1500,
          errorsCount: 1,
          errorPatterns: []
        }
      });

      expect(secondResult.xpAwarded).toBe(0);
      expect(secondResult.profileUpdates.alreadyCompleted).toBe(true);
    });
  });

  describe("Lesson Timeline and Scheduling", () => {
    beforeEach(async () => {
      const curriculum = await curriculumService.generateLearningPath({
        profileId: testProfileId,
        targetLanguage: "Spanish",
        nativeLanguage: "English"
      });
      testCurriculumId = curriculum.id;
    });

    it("should generate lesson timeline with proper states", async () => {
      const timeline = await curriculumService.getLessonTimeline(testProfileId);

      expect(timeline).toBeDefined();
      expect(timeline.lessons.length).toBeGreaterThan(0);
      expect(timeline.completedCount).toBe(0);
      expect(timeline.totalLessons).toBe(timeline.lessons.length);
    });

    it("should mark first lesson as in-progress", async () => {
      const timeline = await curriculumService.getLessonTimeline(testProfileId);
      const firstLesson = timeline.lessons[0];

      expect(firstLesson.state).toBe("in-progress");
      expect(firstLesson.isUnlockedBySchedule).toBe(true);
    });

    it("should update timeline after lesson completion", async () => {
      const timelineBefore = await curriculumService.getLessonTimeline(testProfileId);
      const firstLesson = timelineBefore.lessons[0];

      // Complete first lesson
      await curriculumService.markLessonComplete({
        lessonId: firstLesson.id,
        profileId: testProfileId,
        metrics: {
          accuracy: 0.9,
          completionTime: 1800,
          errorsCount: 2,
          errorPatterns: []
        }
      });

      const timelineAfter = await curriculumService.getLessonTimeline(testProfileId);

      expect(timelineAfter.completedCount).toBe(1);
      expect(timelineAfter.lessons[0].state).toBe("completed");
      expect(timelineAfter.lessons[0].isCompleted).toBe(true);
    });

    it("should calculate completion percentage correctly", async () => {
      const timeline = await curriculumService.getLessonTimeline(testProfileId);
      const totalLessons = timeline.lessons.length;

      // Complete half the lessons
      const lessonsToComplete = Math.floor(totalLessons / 2);
      for (let i = 0; i < lessonsToComplete; i++) {
        await curriculumService.markLessonComplete({
          lessonId: timeline.lessons[i].id,
          profileId: testProfileId,
          metrics: {
            accuracy: 0.9,
            completionTime: 1800,
            errorsCount: 2,
            errorPatterns: []
          }
        });
      }

      const updatedTimeline = await curriculumService.getLessonTimeline(testProfileId);
      const expectedPercent = Math.round((lessonsToComplete / totalLessons) * 100);

      expect(updatedTimeline.completionPercent).toBe(expectedPercent);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid profile ID", async () => {
      await expect(
        curriculumService.generateLearningPath({
          profileId: "invalid-profile-id",
          targetLanguage: "Spanish",
          nativeLanguage: "English"
        })
      ).rejects.toThrow();
    });

    it("should handle invalid lesson ID", async () => {
      const lesson = await curriculumService.getLessonById("invalid-lesson-id");
      expect(lesson).toBeNull();
    });

    it("should handle completion of non-existent lesson", async () => {
      await expect(
        curriculumService.markLessonComplete({
          lessonId: "non-existent-lesson",
          profileId: testProfileId,
          metrics: {
            accuracy: 0.9,
            completionTime: 1800,
            errorsCount: 2,
            errorPatterns: []
          }
        })
      ).rejects.toThrow();
    });
  });
});
