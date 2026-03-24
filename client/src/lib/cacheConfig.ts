/**
 * Cache Configuration for TanStack Query
 * Defines specific cache strategies for different data types
 * Requirements: 20.3, 23.1, 23.5
 */

/**
 * Cache configuration presets for different data types
 * Implements stale-while-revalidate pattern with appropriate timing
 */
export const cacheConfig = {
  /**
   * Lesson content - relatively static, can be cached longer
   * Lessons don't change frequently once generated
   */
  lessons: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },

  /**
   * User profiles - semi-static, moderate cache duration
   * Profiles update occasionally (proficiency level, preferences)
   */
  profiles: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  },

  /**
   * Achievements - static once unlocked, can cache aggressively
   * Achievement definitions rarely change
   */
  achievements: {
    staleTime: 20 * 60 * 1000, // 20 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  /**
   * Gamification data (XP, streaks) - dynamic, shorter cache
   * Updates frequently as user completes activities
   */
  gamification: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Always refetch when user returns
  },

  /**
   * Leaderboard - moderately dynamic, balance freshness and performance
   * Updates as users earn XP, but doesn't need real-time accuracy
   */
  leaderboard: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  },

  /**
   * Progress analytics - can tolerate slight staleness
   * Historical data doesn't change, only new data appends
   */
  analytics: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },

  /**
   * Daily challenges - time-sensitive, shorter cache
   * Resets every 24 hours, needs to be relatively fresh
   */
  dailyChallenge: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  },

  /**
   * AI session data - session-specific, short cache
   * Conversation context needs to be current
   */
  aiSession: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  },

  /**
   * System status and health - can be stale, low priority
   * Used for monitoring, doesn't affect user experience
   */
  system: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  /**
   * Static reference data (languages, etc.) - cache aggressively
   * Rarely changes, can be cached for extended periods
   */
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

/**
 * Helper function to get cache config for a specific data type
 */
export function getCacheConfig(type: keyof typeof cacheConfig) {
  return cacheConfig[type];
}

/**
 * Query key factories for consistent cache key generation
 * Helps with cache invalidation and prefetching
 */
export const queryKeys = {
  // Lessons
  lessons: {
    all: ['/api/lessons'] as const,
    list: (profileId: string) => ['/api/lessons', { profileId }] as const,
    detail: (lessonId: string) => ['/api/lessons', lessonId] as const,
    next: (profileId: string) => ['/api/lessons/next', { profileId }] as const,
    history: (profileId: string) => ['/api/lessons/history', { profileId }] as const,
  },

  // Profiles
  profiles: {
    all: ['/api/profiles'] as const,
    detail: (profileId: string) => ['/api/profiles', profileId] as const,
  },

  // Gamification
  gamification: {
    xp: ['/api/gamification/xp'] as const,
    achievements: ['/api/gamification/achievements'] as const,
    streak: ['/api/gamification/streak'] as const,
    dailyChallenge: ['/api/gamification/daily-challenge'] as const,
    leaderboard: (filters?: { language?: string; period?: string; limit?: number }) =>
      ['/api/gamification/leaderboard', filters] as const,
  },

  // Progress
  progress: {
    overview: (profileId: string) => ['/api/progress', profileId] as const,
    weaknesses: (profileId: string) => ['/api/progress', profileId, 'weaknesses'] as const,
    pronunciation: (profileId: string) => ['/api/progress', profileId, 'pronunciation'] as const,
    analytics: (profileId: string, timeRange?: string) =>
      ['/api/progress', profileId, 'analytics', { timeRange }] as const,
  },

  // AI Sessions
  ai: {
    tutorSession: (profileId: string) => ['/api/tutor/session', profileId] as const,
    voiceSession: (sessionId: string) => ['/api/voice/session', sessionId] as const,
    insights: (languageId: string) => ['/api/ai/insights', languageId] as const,
  },

  // System
  system: {
    health: ['/api/health'] as const,
    languages: ['/api/languages'] as const,
  },
} as const;
