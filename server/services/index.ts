import { BaseService } from './BaseService';
import { OpenAIService } from './OpenAIService';
import { GeminiService } from './GeminiService';
import { AITeacherService } from './AITeacherService';
import { UserService } from './UserService';
import { LanguageService } from './LanguageService';
import { LessonService } from './LessonService';
import { AchievementService } from './AchievementService';
import { ChallengeService } from './ChallengeService';
import { AdminService } from './AdminService';

// Initialize services
const openAIService = new OpenAIService();
const geminiService = new GeminiService();
const aiTeacherService = new AITeacherService(openAIService, geminiService);
const userService = new UserService();
const languageService = new LanguageService();
const lessonService = new LessonService();
const achievementService = new AchievementService();
const challengeService = new ChallengeService();
const adminService = new AdminService();

// Export service instances
export {
  openAIService,
  geminiService,
  aiTeacherService,
  userService,
  languageService,
  lessonService,
  achievementService,
  challengeService,
  adminService
};

// Export service classes
export {
  BaseService,
  OpenAIService,
  GeminiService,
  AITeacherService,
  UserService,
  LanguageService,
  LessonService,
  AchievementService,
  ChallengeService,
  AdminService
};
