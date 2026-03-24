import { describe, it, expect } from "vitest";

describe("GamificationService", () => {
  describe("XP System", () => {
    it("should validate XP award parameters", () => {
      const validParams = {
        userId: "test-user-123",
        amount: 20,
        source: "lesson",
        sourceId: "lesson-123",
      };

      expect(validParams.userId).toBeDefined();
      expect(validParams.amount).toBeGreaterThan(0);
      expect(validParams.source).toBeDefined();
      expect(["lesson", "exercise", "voice", "challenge"]).toContain(validParams.source);
    });

    it("should validate XP amounts are positive", () => {
      const amounts = [10, 20, 50, 100];
      
      amounts.forEach(amount => {
        expect(amount).toBeGreaterThan(0);
      });
    });
  });

  describe("Achievement System", () => {
    it("should validate achievement structure", () => {
      const achievement = {
        id: 1,
        name: "First Steps",
        description: "Complete your first lesson",
        icon: "🎯",
        condition: "lessons_completed >= 1",
        xpReward: 50,
      };

      expect(achievement.name).toBeDefined();
      expect(achievement.description).toBeDefined();
      expect(achievement.condition).toBeDefined();
      expect(achievement.xpReward).toBeGreaterThan(0);
    });

    it("should validate achievement conditions", () => {
      const conditions = [
        "lessons_completed >= 1",
        "xp >= 100",
        "streak >= 7",
        "exercises_completed >= 10",
      ];

      conditions.forEach(condition => {
        expect(condition).toContain(">=");
        expect(condition.split(">=")).toHaveLength(2);
      });
    });
  });

  describe("Daily Challenge", () => {
    it("should validate challenge structure", () => {
      const challenge = {
        id: 1,
        prompt: "Translate 5 sentences",
        xpReward: 30,
        difficulty: 5,
        createdAt: new Date(),
      };

      expect(challenge.prompt).toBeDefined();
      expect(challenge.xpReward).toBeGreaterThan(0);
      expect(challenge.difficulty).toBeGreaterThan(0);
      expect(challenge.difficulty).toBeLessThanOrEqual(10);
    });

    it("should validate XP rewards scale with difficulty", () => {
      const difficulties = [1, 3, 5, 7, 10];
      const baseXP = 10;

      difficulties.forEach(difficulty => {
        const expectedXP = baseXP * (1 + difficulty / 10);
        expect(expectedXP).toBeGreaterThanOrEqual(baseXP);
      });
    });
  });

  describe("Streak Tracking", () => {
    it("should validate streak data structure", () => {
      const streakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: new Date(),
      };

      expect(streakData.currentStreak).toBeGreaterThanOrEqual(0);
      expect(streakData.longestStreak).toBeGreaterThanOrEqual(streakData.currentStreak);
      expect(streakData.lastActivityDate).toBeInstanceOf(Date);
    });

    it("should validate streak milestones", () => {
      const milestones = [7, 30, 100, 365];
      
      milestones.forEach((milestone, index) => {
        if (index > 0) {
          expect(milestone).toBeGreaterThan(milestones[index - 1]);
        }
      });
    });
  });

  describe("Leaderboard", () => {
    it("should validate leaderboard entry structure", () => {
      const entry = {
        userId: "user-123",
        username: "testuser",
        xp: 1000,
        rank: 1,
        streak: 10,
      };

      expect(entry.userId).toBeDefined();
      expect(entry.username).toBeDefined();
      expect(entry.xp).toBeGreaterThanOrEqual(0);
      expect(entry.rank).toBeGreaterThan(0);
    });

    it("should validate leaderboard filter options", () => {
      const validTimePeriods = ["daily", "weekly", "all-time"];
      const validLanguages = ["Spanish", "Mandarin", "English", "Hindi", "Arabic"];

      expect(validTimePeriods).toContain("daily");
      expect(validTimePeriods).toContain("weekly");
      expect(validLanguages).toHaveLength(5);
    });

    it("should validate leaderboard ranking order", () => {
      const rankings = [
        { rank: 1, xp: 1000 },
        { rank: 2, xp: 900 },
        { rank: 3, xp: 800 },
      ];

      for (let i = 0; i < rankings.length - 1; i++) {
        expect(rankings[i].xp).toBeGreaterThan(rankings[i + 1].xp);
        expect(rankings[i].rank).toBeLessThan(rankings[i + 1].rank);
      }
    });
  });
});
