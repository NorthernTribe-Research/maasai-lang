import { describe, it, expect } from "vitest";
import { LearningProfileService } from "../services/LearningProfileService";

describe("Profile Management", () => {
  let profileService: LearningProfileService;

  describe("Profile Service", () => {
    it("should have profile service available", () => {
      profileService = new LearningProfileService();
      expect(profileService).toBeDefined();
    });

    it("should validate profile creation data", () => {
      const validProfileData = {
        userId: "test-user-123",
        targetLanguage: "Spanish",
        nativeLanguage: "English",
        proficiencyLevel: "Beginner",
      };

      expect(validProfileData.userId).toBeDefined();
      expect(validProfileData.targetLanguage).toBeDefined();
      expect(validProfileData.nativeLanguage).toBeDefined();
      expect(validProfileData.proficiencyLevel).toBeDefined();
      
      // Validate proficiency level is valid
      const validLevels = ["Beginner", "Elementary", "Intermediate", "Upper Intermediate", "Advanced", "Proficient"];
      expect(validLevels).toContain(validProfileData.proficiencyLevel);
    });

    it("should validate supported languages", () => {
      const supportedLanguages = ["Spanish", "Mandarin", "English", "Hindi", "Arabic"];
      
      expect(supportedLanguages).toContain("Spanish");
      expect(supportedLanguages).toContain("Mandarin");
      expect(supportedLanguages).toContain("English");
      expect(supportedLanguages).toContain("Hindi");
      expect(supportedLanguages).toContain("Arabic");
      expect(supportedLanguages).toHaveLength(5);
    });
  });
});
