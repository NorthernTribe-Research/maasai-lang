import { 
  User, InsertUser, Language, InsertLanguage, UserLanguage, InsertUserLanguage,
  Lesson, InsertLesson, UserLesson, InsertUserLesson, Achievement, InsertAchievement,
  UserAchievement, InsertUserAchievement, Challenge, InsertChallenge,
  DailyChallenge, InsertDailyChallenge
} from "@shared/schema";
import { differenceInDays, startOfDay, isToday } from "date-fns";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStreak(userId: number): Promise<User>;
  
  // Language operations
  getAllLanguages(): Promise<Language[]>;
  getLanguageByCode(code: string): Promise<Language | undefined>;
  addLanguage(language: InsertLanguage): Promise<Language>;
  
  // UserLanguage operations
  getUserLanguages(userId: number): Promise<(UserLanguage & { language: Language })[]>;
  addUserLanguage(userLanguage: InsertUserLanguage): Promise<UserLanguage>;
  updateUserLanguageProgress(userId: number, languageId: number, progress: number): Promise<UserLanguage>;
  
  // Lesson operations
  getLessonsByLanguage(languageId: number): Promise<Lesson[]>;
  getUserLessonsForLanguage(userId: number, languageId: number): Promise<(UserLesson & { lesson: Lesson })[]>;
  startUserLesson(userLesson: InsertUserLesson): Promise<UserLesson>;
  completeUserLesson(userId: number, lessonId: number, progress: number): Promise<UserLesson>;
  
  // Achievement operations
  getAllAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: number): Promise<(UserAchievement & { achievement: Achievement })[]>;
  awardAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  
  // Challenge operations
  getDailyChallenge(userId: number): Promise<(DailyChallenge & { challenge: Challenge }) | null>;
  completeDailyChallenge(userId: number, challengeId: number, isCorrect: boolean): Promise<{ success: boolean; xpEarned: number }>;
  getLeaderboard(): Promise<{ id: number; username: string; displayName: string | null; xp: number; languageId?: number; languageName?: string; }[]>;
  
  // Initialization
  initializeData(): Promise<void>;
  
  // Session store
  sessionStore: session.SessionStore;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private languages: Map<number, Language>;
  private userLanguages: Map<number, UserLanguage>;
  private lessons: Map<number, Lesson>;
  private userLessons: Map<number, UserLesson>;
  private achievements: Map<number, Achievement>;
  private userAchievements: Map<number, UserAchievement>;
  private challenges: Map<number, Challenge>;
  private dailyChallenges: Map<number, DailyChallenge>;
  
  currentUserId: number;
  currentLanguageId: number;
  currentUserLanguageId: number;
  currentLessonId: number;
  currentUserLessonId: number;
  currentAchievementId: number;
  currentUserAchievementId: number;
  currentChallengeId: number;
  currentDailyChallengeId: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.languages = new Map();
    this.userLanguages = new Map();
    this.lessons = new Map();
    this.userLessons = new Map();
    this.achievements = new Map();
    this.userAchievements = new Map();
    this.challenges = new Map();
    this.dailyChallenges = new Map();
    
    this.currentUserId = 1;
    this.currentLanguageId = 1;
    this.currentUserLanguageId = 1;
    this.currentLessonId = 1;
    this.currentUserLessonId = 1;
    this.currentAchievementId = 1;
    this.currentUserAchievementId = 1;
    this.currentChallengeId = 1;
    this.currentDailyChallengeId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      xp: 0, 
      streak: 0, 
      lastActive: now, 
      streakUpdatedAt: now,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStreak(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const lastActiveDate = user.lastActive;
    const daysSinceLastActive = differenceInDays(now, startOfDay(lastActiveDate));

    let updatedUser: User;

    // If last active was today, just update lastActive
    if (isToday(lastActiveDate)) {
      updatedUser = { ...user, lastActive: now };
    } 
    // If last active was yesterday, increment streak
    else if (daysSinceLastActive === 1) {
      updatedUser = { 
        ...user, 
        streak: user.streak + 1, 
        lastActive: now,
        streakUpdatedAt: now 
      };
    } 
    // If more than 1 day has passed, reset streak
    else {
      updatedUser = { 
        ...user, 
        streak: 1, 
        lastActive: now,
        streakUpdatedAt: now 
      };
    }

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Language operations
  async getAllLanguages(): Promise<Language[]> {
    return Array.from(this.languages.values());
  }

  async getLanguageByCode(code: string): Promise<Language | undefined> {
    return Array.from(this.languages.values()).find(
      (language) => language.code === code
    );
  }

  async addLanguage(language: InsertLanguage): Promise<Language> {
    const id = this.currentLanguageId++;
    const newLanguage: Language = { ...language, id };
    this.languages.set(id, newLanguage);
    return newLanguage;
  }

  // UserLanguage operations
  async getUserLanguages(userId: number): Promise<(UserLanguage & { language: Language })[]> {
    const userLanguages = Array.from(this.userLanguages.values()).filter(
      (ul) => ul.userId === userId
    );

    return userLanguages.map(ul => {
      const language = this.languages.get(ul.languageId)!;
      return { ...ul, language };
    });
  }

  async addUserLanguage(userLanguage: InsertUserLanguage): Promise<UserLanguage> {
    // Check if user already has this language
    const existingUserLanguage = Array.from(this.userLanguages.values()).find(
      (ul) => ul.userId === userLanguage.userId && ul.languageId === userLanguage.languageId
    );

    if (existingUserLanguage) {
      return existingUserLanguage;
    }

    const id = this.currentUserLanguageId++;
    const now = new Date();
    const newUserLanguage: UserLanguage = {
      ...userLanguage,
      id,
      level: 1,
      progress: 0,
      isActive: true,
      createdAt: now
    };
    this.userLanguages.set(id, newUserLanguage);
    return newUserLanguage;
  }

  async updateUserLanguageProgress(userId: number, languageId: number, progress: number): Promise<UserLanguage> {
    const userLanguage = Array.from(this.userLanguages.values()).find(
      (ul) => ul.userId === userId && ul.languageId === languageId
    );

    if (!userLanguage) {
      throw new Error("User language not found");
    }

    // Calculate new level based on progress
    let newLevel = userLanguage.level;
    if (progress >= 100) {
      newLevel += 1;
      progress = 0;
    }

    const updatedUserLanguage: UserLanguage = {
      ...userLanguage,
      progress,
      level: newLevel
    };

    this.userLanguages.set(userLanguage.id, updatedUserLanguage);
    return updatedUserLanguage;
  }

  // Lesson operations
  async getLessonsByLanguage(languageId: number): Promise<Lesson[]> {
    const lessons = Array.from(this.lessons.values()).filter(
      (lesson) => lesson.languageId === languageId
    );

    // Sort by level and order
    return lessons.sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.order - b.order;
    });
  }

  async getUserLessonsForLanguage(userId: number, languageId: number): Promise<(UserLesson & { lesson: Lesson })[]> {
    const lessons = await this.getLessonsByLanguage(languageId);
    
    const userLessons = Array.from(this.userLessons.values()).filter(
      (ul) => ul.userId === userId && lessons.some(l => l.id === ul.lessonId)
    );

    const result: (UserLesson & { lesson: Lesson })[] = [];

    // Include all lessons, even those user hasn't started yet
    for (const lesson of lessons) {
      const userLesson = userLessons.find(ul => ul.lessonId === lesson.id);
      
      if (userLesson) {
        result.push({ ...userLesson, lesson });
      } else {
        // Create a placeholder for lessons not started
        result.push({
          id: 0, // placeholder id
          userId,
          lessonId: lesson.id,
          isCompleted: false,
          progress: 0,
          lastAccessed: undefined,
          completedAt: undefined,
          lesson
        });
      }
    }

    return result;
  }

  async startUserLesson(userLesson: InsertUserLesson): Promise<UserLesson> {
    // Check if user already started this lesson
    const existingUserLesson = Array.from(this.userLessons.values()).find(
      (ul) => ul.userId === userLesson.userId && ul.lessonId === userLesson.lessonId
    );

    if (existingUserLesson) {
      // Update lastAccessed time
      const updatedUserLesson: UserLesson = {
        ...existingUserLesson,
        lastAccessed: new Date()
      };
      this.userLessons.set(existingUserLesson.id, updatedUserLesson);
      return updatedUserLesson;
    }

    const id = this.currentUserLessonId++;
    const now = new Date();
    const newUserLesson: UserLesson = {
      ...userLesson,
      id,
      isCompleted: false,
      progress: 0,
      lastAccessed: now,
      completedAt: undefined
    };
    this.userLessons.set(id, newUserLesson);
    return newUserLesson;
  }

  async completeUserLesson(userId: number, lessonId: number, progress: number): Promise<UserLesson> {
    // Find the user lesson
    let userLesson = Array.from(this.userLessons.values()).find(
      (ul) => ul.userId === userId && ul.lessonId === lessonId
    );

    // If not found, create it
    if (!userLesson) {
      userLesson = await this.startUserLesson({ userId, lessonId });
    }

    const lesson = this.lessons.get(lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    const now = new Date();
    const isCompleted = progress >= 100;
    const completedAt = isCompleted ? now : userLesson.completedAt;

    // If lesson is completed for the first time, reward XP
    let xpToAdd = 0;
    if (isCompleted && !userLesson.isCompleted) {
      xpToAdd = lesson.xpReward;
      
      // Get the user and update XP
      const user = await this.getUser(userId);
      if (user) {
        const updatedUser: User = {
          ...user,
          xp: user.xp + xpToAdd
        };
        this.users.set(userId, updatedUser);
        
        // Check for achievements
        this.checkAchievements(userId);
      }
      
      // Update language progress
      const language = await this.getLanguageByCode(this.languages.get(lesson.languageId)?.code || "");
      if (language) {
        // Get all completed lessons for this language
        const completedLessons = (await this.getUserLessonsForLanguage(userId, language.id))
          .filter(ul => ul.isCompleted || (ul.lessonId === lessonId && isCompleted));
          
        // Get total lessons for this language
        const totalLessons = await this.getLessonsByLanguage(language.id);
        
        if (totalLessons.length > 0) {
          // Calculate progress percentage
          const languageProgress = Math.min(100, Math.floor((completedLessons.length / totalLessons.length) * 100));
          
          // Update user language progress
          await this.updateUserLanguageProgress(userId, language.id, languageProgress);
        }
      }
    }

    const updatedUserLesson: UserLesson = {
      ...userLesson,
      progress: Math.min(100, progress),
      isCompleted,
      lastAccessed: now,
      completedAt
    };

    this.userLessons.set(userLesson.id, updatedUserLesson);
    return updatedUserLesson;
  }

  // Achievement operations
  async getAllAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values());
  }

  async getUserAchievements(userId: number): Promise<(UserAchievement & { achievement: Achievement })[]> {
    const userAchievements = Array.from(this.userAchievements.values()).filter(
      (ua) => ua.userId === userId
    );

    return userAchievements.map(ua => {
      const achievement = this.achievements.get(ua.achievementId)!;
      return { ...ua, achievement };
    });
  }

  async awardAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    // Check if user already has this achievement
    const existingUserAchievement = Array.from(this.userAchievements.values()).find(
      (ua) => ua.userId === userAchievement.userId && ua.achievementId === userAchievement.achievementId
    );

    if (existingUserAchievement) {
      return existingUserAchievement;
    }

    const id = this.currentUserAchievementId++;
    const now = new Date();
    const newUserAchievement: UserAchievement = {
      ...userAchievement,
      id,
      earnedAt: now
    };
    this.userAchievements.set(id, newUserAchievement);
    return newUserAchievement;
  }

  // Challenge operations
  async getDailyChallenge(userId: number): Promise<(DailyChallenge & { challenge: Challenge }) | null> {
    // Find today's challenge for the user
    const today = startOfDay(new Date());
    
    let dailyChallenge = Array.from(this.dailyChallenges.values()).find(
      (dc) => dc.userId === userId && isToday(dc.date)
    );

    // If no challenge for today, create one
    if (!dailyChallenge) {
      // Get user's active languages
      const userLanguages = await this.getUserLanguages(userId);
      
      if (userLanguages.length === 0) {
        return null; // User has no languages to create a challenge for
      }
      
      // Pick a random language from user's languages
      const randomLanguage = userLanguages[Math.floor(Math.random() * userLanguages.length)];
      
      // Find challenges for this language
      const languageChallenges = Array.from(this.challenges.values()).filter(
        (challenge) => challenge.languageId === randomLanguage.languageId
      );
      
      if (languageChallenges.length === 0) {
        return null; // No challenges available for this language
      }
      
      // Pick a random challenge
      const randomChallenge = languageChallenges[Math.floor(Math.random() * languageChallenges.length)];
      
      // Create daily challenge
      const id = this.currentDailyChallengeId++;
      dailyChallenge = {
        id,
        userId,
        challengeId: randomChallenge.id,
        date: today,
        isCompleted: false,
        completedAt: undefined
      };
      
      this.dailyChallenges.set(id, dailyChallenge);
    }

    const challenge = this.challenges.get(dailyChallenge.challengeId)!;
    return { ...dailyChallenge, challenge };
  }

  async completeDailyChallenge(
    userId: number, 
    challengeId: number, 
    isCorrect: boolean
  ): Promise<{ success: boolean; xpEarned: number }> {
    // Find the daily challenge
    const dailyChallenge = Array.from(this.dailyChallenges.values()).find(
      (dc) => dc.userId === userId && dc.challengeId === challengeId && isToday(dc.date)
    );

    if (!dailyChallenge) {
      throw new Error("Daily challenge not found");
    }

    if (dailyChallenge.isCompleted) {
      return { success: false, xpEarned: 0 }; // Already completed
    }

    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error("Challenge not found");
    }

    const now = new Date();
    const updatedDailyChallenge: DailyChallenge = {
      ...dailyChallenge,
      isCompleted: true,
      completedAt: now
    };

    this.dailyChallenges.set(dailyChallenge.id, updatedDailyChallenge);

    // Only reward XP if the answer was correct
    let xpEarned = 0;
    if (isCorrect) {
      xpEarned = challenge.xpReward;
      
      // Update user XP
      const user = await this.getUser(userId);
      if (user) {
        const updatedUser: User = {
          ...user,
          xp: user.xp + xpEarned
        };
        this.users.set(userId, updatedUser);
        
        // Update streak
        await this.updateUserStreak(userId);
        
        // Check for achievements
        this.checkAchievements(userId);
      }
    }

    return { success: true, xpEarned };
  }

  async getLeaderboard(): Promise<{ id: number; username: string; displayName: string | null; xp: number; languageId?: number; languageName?: string; }[]> {
    // Get all users sorted by XP
    const usersList = Array.from(this.users.values()).sort((a, b) => b.xp - a.xp);
    
    const leaderboard = usersList.map(user => {
      // Find user's top language
      const userLanguages = Array.from(this.userLanguages.values()).filter(
        (ul) => ul.userId === user.id
      );
      
      let topLanguage: { languageId?: number; languageName?: string } = {};
      
      if (userLanguages.length > 0) {
        // Find the language with highest level/progress
        const topUserLanguage = userLanguages.reduce((prev, current) => {
          if (current.level > prev.level) {
            return current;
          }
          if (current.level === prev.level && current.progress > prev.progress) {
            return current;
          }
          return prev;
        });
        
        const language = this.languages.get(topUserLanguage.languageId);
        if (language) {
          topLanguage = {
            languageId: language.id,
            languageName: language.name
          };
        }
      }
      
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        xp: user.xp,
        ...topLanguage
      };
    });
    
    return leaderboard;
  }

  // Helper to check and award achievements
  private async checkAchievements(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    
    const userLessons = Array.from(this.userLessons.values()).filter(
      (ul) => ul.userId === userId && ul.isCompleted
    );
    
    const userLanguages = await this.getUserLanguages(userId);
    
    const dailyChallenges = Array.from(this.dailyChallenges.values()).filter(
      (dc) => dc.userId === userId && dc.isCompleted
    );
    
    // Check lesson completions
    if (userLessons.length >= 5) {
      const achievement = Array.from(this.achievements.values()).find(
        (a) => a.name === "First Steps"
      );
      
      if (achievement) {
        await this.awardAchievement({
          userId,
          achievementId: achievement.id
        });
      }
    }
    
    // Check streak
    if (user.streak >= 7) {
      const achievement = Array.from(this.achievements.values()).find(
        (a) => a.name === "Week Warrior"
      );
      
      if (achievement) {
        await this.awardAchievement({
          userId,
          achievementId: achievement.id
        });
      }
    }
    
    // Check XP earned in a day
    // Since we don't track daily XP, we'll just check if they've earned enough total
    if (user.xp >= 100) {
      const achievement = Array.from(this.achievements.values()).find(
        (a) => a.name === "Quick Learner"
      );
      
      if (achievement) {
        await this.awardAchievement({
          userId,
          achievementId: achievement.id
        });
      }
    }
  }

  // Initialize sample data
  async initializeData(): Promise<void> {
    // Only initialize if no data exists
    if (this.languages.size > 0) {
      return;
    }

    // Add languages
    const spanish = await this.addLanguage({
      code: "es",
      name: "Spanish",
      flag: "https://images.unsplash.com/photo-1522930514098-5b8a10f0cb66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8c3BhaW58fHx8fHwxNzA1MzEyMzk1&ixlib=rb-4.0.3&q=80&w=50",
      description: "Learn Spanish, one of the world's most spoken languages.",
    });

    const mandarin = await this.addLanguage({
      code: "zh",
      name: "Mandarin",
      flag: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8Y2hpbmF8fHx8fHwxNzA1MzEyMzk1&ixlib=rb-4.0.3&q=80&w=50",
      description: "Learn Mandarin Chinese, the most spoken language in the world.",
    });

    // Add lessons for Spanish
    await this.addLesson({
      languageId: spanish.id,
      title: "Basics",
      description: "Learn basic Spanish words and phrases.",
      level: 1,
      type: "vocabulary",
      xpReward: 10,
      order: 1,
      duration: 10,
      icon: "bx-rocket",
    });

    await this.addLesson({
      languageId: spanish.id,
      title: "Greetings",
      description: "Learn how to greet people in Spanish.",
      level: 1,
      type: "conversation",
      xpReward: 15,
      order: 2,
      duration: 15,
      icon: "bx-conversation",
    });

    await this.addLesson({
      languageId: spanish.id,
      title: "Food & Dining",
      description: "Learn vocabulary for food and restaurants.",
      level: 1,
      type: "vocabulary",
      xpReward: 20,
      order: 3,
      duration: 20,
      icon: "bx-food-menu",
    });

    await this.addLesson({
      languageId: spanish.id,
      title: "Present Tense",
      description: "Learn to conjugate verbs in the present tense.",
      level: 2,
      type: "grammar",
      xpReward: 25,
      order: 1,
      duration: 25,
      icon: "bx-book",
    });

    await this.addLesson({
      languageId: spanish.id,
      title: "Restaurant Conversations",
      description: "Learn how to order food and make requests in restaurants.",
      level: 3,
      type: "conversation",
      xpReward: 15,
      order: 1,
      duration: 15,
      icon: "bx-conversation",
    });

    await this.addLesson({
      languageId: spanish.id,
      title: "Past Tense Mastery",
      description: "Master the preterite and imperfect past tenses.",
      level: 3,
      type: "grammar",
      xpReward: 30,
      order: 2,
      duration: 25,
      icon: "bx-book",
    });

    // Add lessons for Mandarin
    await this.addLesson({
      languageId: mandarin.id,
      title: "Basic Characters",
      description: "Learn essential Mandarin characters.",
      level: 1,
      type: "vocabulary",
      xpReward: 25,
      order: 1,
      duration: 20,
      icon: "bx-palette",
    });

    await this.addLesson({
      languageId: mandarin.id,
      title: "Basic Greetings",
      description: "Learn common greetings in Mandarin.",
      level: 1,
      type: "conversation",
      xpReward: 15,
      order: 2,
      duration: 15,
      icon: "bx-conversation",
    });

    // Add achievements
    await this.addAchievement({
      name: "First Steps",
      description: "Completed 5 Spanish lessons",
      icon: "bx-rocket",
      condition: JSON.stringify({ type: "lesson_completion", count: 5 }),
    });

    await this.addAchievement({
      name: "Week Warrior",
      description: "Maintained a 7-day streak",
      icon: "bx-calendar-check",
      condition: JSON.stringify({ type: "streak", days: 7 }),
    });

    await this.addAchievement({
      name: "Quick Learner",
      description: "Earned 100 XP in one day",
      icon: "bx-bulb",
      condition: JSON.stringify({ type: "xp_daily", amount: 100 }),
    });

    await this.addAchievement({
      name: "Perfect Score",
      description: "Complete a lesson without errors",
      icon: "bx-medal",
      condition: JSON.stringify({ type: "perfect_lesson" }),
    });

    // Add challenges
    await this.addChallenge({
      languageId: spanish.id,
      prompt: "I would like to order a coffee, please.",
      answer: "Me gustaría pedir un café, por favor.",
      type: "translation",
      difficulty: 2,
      xpReward: 20,
    });

    await this.addChallenge({
      languageId: spanish.id,
      prompt: "Good morning, how are you?",
      answer: "Buenos días, ¿cómo estás?",
      type: "translation",
      difficulty: 1,
      xpReward: 10,
    });

    await this.addChallenge({
      languageId: mandarin.id,
      prompt: "Hello, my name is...",
      answer: "你好，我的名字是...",
      type: "translation",
      difficulty: 1,
      xpReward: 15,
    });
  }

  // Helper methods for creating data
  private async addLesson(lesson: InsertLesson): Promise<Lesson> {
    const id = this.currentLessonId++;
    const newLesson: Lesson = { ...lesson, id };
    this.lessons.set(id, newLesson);
    return newLesson;
  }

  private async addAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = this.currentAchievementId++;
    const newAchievement: Achievement = { ...achievement, id };
    this.achievements.set(id, newAchievement);
    return newAchievement;
  }

  private async addChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const id = this.currentChallengeId++;
    const newChallenge: Challenge = { ...challenge, id };
    this.challenges.set(id, newChallenge);
    return newChallenge;
  }
}

export const storage = new MemStorage();
