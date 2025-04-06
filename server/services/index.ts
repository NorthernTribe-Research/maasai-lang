import { UserService } from './UserService';
import { LanguageService } from './LanguageService';
import { LessonService } from './LessonService';
import { AchievementService } from './AchievementService';
import { ChallengeService } from './ChallengeService';
import { OpenAIService } from './OpenAIService';

// Create singleton instances for all services
export const userService = new UserService();
export const languageService = new LanguageService();
export const lessonService = new LessonService();
export const achievementService = new AchievementService();
export const challengeService = new ChallengeService();
export const openAIService = new OpenAIService();

// Export service classes
export {
  UserService,
  LanguageService,
  LessonService,
  AchievementService,
  ChallengeService,
  OpenAIService
};