/**
 * Cache Management Utilities
 * Provides helpers for cache invalidation, prefetching, and optimization
 * Requirements: 20.3, 23.1, 23.5
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './cacheConfig';

/**
 * Invalidate all gamification-related queries
 * Call after completing activities that award XP, achievements, etc.
 */
export async function invalidateGamificationData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.gamification.xp }),
    queryClient.invalidateQueries({ queryKey: queryKeys.gamification.achievements }),
    queryClient.invalidateQueries({ queryKey: queryKeys.gamification.streak }),
    queryClient.invalidateQueries({ queryKey: queryKeys.gamification.leaderboard() }),
  ]);
}

/**
 * Invalidate progress-related queries
 * Call after completing lessons, exercises, or other learning activities
 */
export async function invalidateProgressData(queryClient: QueryClient, profileId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.progress.overview(profileId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.progress.weaknesses(profileId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.progress.pronunciation(profileId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.progress.analytics(profileId) }),
  ]);
}

/**
 * Invalidate lesson-related queries
 * Call after completing a lesson or when curriculum changes
 */
export async function invalidateLessonData(queryClient: QueryClient, profileId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.lessons.list(profileId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.lessons.next(profileId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.lessons.history(profileId) }),
  ]);
}

/**
 * Prefetch next lesson for smoother navigation
 * Call when user is viewing current lesson or dashboard
 */
export async function prefetchNextLesson(queryClient: QueryClient, profileId: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.lessons.next(profileId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Prefetch lesson details for smoother navigation
 * Call when user hovers over lesson card or is likely to view it
 */
export async function prefetchLessonDetail(queryClient: QueryClient, lessonId: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.lessons.detail(lessonId),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Optimistically update XP in cache
 * Provides immediate feedback while server processes the update
 */
export function optimisticallyUpdateXP(
  queryClient: QueryClient,
  xpGain: number
) {
  queryClient.setQueryData(queryKeys.gamification.xp, (old: any) => {
    if (!old) return old;
    return {
      ...old,
      totalXP: (old.totalXP || 0) + xpGain,
      recentGains: [
        { amount: xpGain, timestamp: new Date() },
        ...(old.recentGains || []).slice(0, 4),
      ],
    };
  });
}

/**
 * Optimistically update streak in cache
 * Provides immediate feedback when user completes daily activity
 */
export function optimisticallyUpdateStreak(
  queryClient: QueryClient,
  increment: boolean = true
) {
  queryClient.setQueryData(queryKeys.gamification.streak, (old: any) => {
    if (!old) return old;
    const newStreak = increment ? (old.currentStreak || 0) + 1 : 0;
    return {
      ...old,
      currentStreak: newStreak,
      longestStreak: Math.max(old.longestStreak || 0, newStreak),
      lastActivity: new Date(),
    };
  });
}

/**
 * Clear all cached data for a user
 * Call on logout or when switching profiles
 */
export async function clearUserCache(queryClient: QueryClient) {
  await queryClient.clear();
}

/**
 * Refresh critical user data
 * Call when user returns to app or after important actions
 */
export async function refreshCriticalData(queryClient: QueryClient, profileId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.gamification.xp }),
    queryClient.invalidateQueries({ queryKey: queryKeys.gamification.streak }),
    queryClient.invalidateQueries({ queryKey: queryKeys.gamification.dailyChallenge }),
    queryClient.invalidateQueries({ queryKey: queryKeys.progress.overview(profileId) }),
  ]);
}

/**
 * Get cached data without triggering a fetch
 * Useful for reading current state in event handlers
 */
export function getCachedData<T>(queryClient: QueryClient, queryKey: readonly unknown[]): T | undefined {
  return queryClient.getQueryData<T>(queryKey);
}

/**
 * Set cached data manually
 * Useful for optimistic updates or after mutations
 */
export function setCachedData<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  data: T | ((old: T | undefined) => T)
) {
  queryClient.setQueryData<T>(queryKey, data);
}
