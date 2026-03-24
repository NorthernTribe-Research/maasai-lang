/**
 * Custom hook for queries with optimized caching
 * Implements stale-while-revalidate pattern
 * Requirements: 20.3, 23.1, 23.5
 */

import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { getCacheConfig } from '@/lib/cacheConfig';

type CacheType = 'lessons' | 'profiles' | 'achievements' | 'gamification' | 'leaderboard' | 
                 'analytics' | 'dailyChallenge' | 'aiSession' | 'system' | 'static';

/**
 * Enhanced useQuery hook with automatic cache configuration
 * 
 * @param queryKey - Query key for cache identification
 * @param cacheType - Type of data being cached (determines cache duration)
 * @param options - Additional query options (merged with cache config)
 * 
 * @example
 * const { data, isLoading } = useCachedQuery(
 *   ['/api/lessons', lessonId],
 *   'lessons',
 *   { enabled: !!lessonId }
 * );
 */
export function useCachedQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  cacheType: CacheType,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey'>
) {
  const cacheConfig = getCacheConfig(cacheType);

  return useQuery<TData, TError>({
    queryKey,
    ...cacheConfig,
    ...options, // User options override cache config if needed
  });
}

/**
 * Hook for lesson data with optimized caching
 */
export function useLessonQuery<TData = unknown>(
  queryKey: QueryKey,
  options?: Omit<UseQueryOptions<TData>, 'queryKey'>
) {
  return useCachedQuery<TData>(queryKey, 'lessons', options);
}

/**
 * Hook for profile data with optimized caching
 */
export function useProfileQuery<TData = unknown>(
  queryKey: QueryKey,
  options?: Omit<UseQueryOptions<TData>, 'queryKey'>
) {
  return useCachedQuery<TData>(queryKey, 'profiles', options);
}

/**
 * Hook for gamification data with optimized caching
 */
export function useGamificationQuery<TData = unknown>(
  queryKey: QueryKey,
  options?: Omit<UseQueryOptions<TData>, 'queryKey'>
) {
  return useCachedQuery<TData>(queryKey, 'gamification', options);
}

/**
 * Hook for analytics data with optimized caching
 */
export function useAnalyticsQuery<TData = unknown>(
  queryKey: QueryKey,
  options?: Omit<UseQueryOptions<TData>, 'queryKey'>
) {
  return useCachedQuery<TData>(queryKey, 'analytics', options);
}
