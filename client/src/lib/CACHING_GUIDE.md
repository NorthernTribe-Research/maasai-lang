# TanStack Query Caching Guide

## Overview

This guide explains the caching strategy implemented for the LinguaMaster platform. The implementation follows the **stale-while-revalidate** pattern to provide optimal user experience by showing cached content immediately while fetching updates in the background.

**Requirements Addressed:** 20.3, 23.1, 23.5

## Architecture

### Core Principles

1. **Stale-While-Revalidate**: Display cached data immediately, fetch fresh data in background
2. **Tiered Caching**: Different cache durations based on data volatility
3. **Smart Invalidation**: Automatic cache updates after mutations
4. **Optimistic Updates**: Immediate UI feedback for better UX

### Cache Configuration

The caching system uses three key timing parameters:

- **staleTime**: How long data is considered "fresh" (no refetch needed)
- **gcTime**: How long unused data stays in cache before garbage collection
- **refetchOnWindowFocus**: Whether to refetch when user returns to tab

## Data Type Cache Strategies

### Lessons (15 min stale, 30 min cache)
```typescript
// Lessons are relatively static once generated
const { data } = useLessonQuery(['/api/lessons', lessonId]);
```

**Rationale**: Lesson content doesn't change frequently. Longer cache reduces API calls while ensuring content stays current.

### User Profiles (10 min stale, 20 min cache)
```typescript
// Profiles update occasionally (proficiency, preferences)
const { data } = useProfileQuery(['/api/profiles', profileId]);
```

**Rationale**: Profiles change moderately (level ups, settings). Medium cache balances freshness and performance.

### Gamification Data (2 min stale, 5 min cache)
```typescript
// XP, streaks, achievements - updates frequently
const { data } = useGamificationQuery(['/api/gamification/xp']);
```

**Rationale**: Gamification data changes with every activity. Short cache ensures users see recent progress.

### Achievements (20 min stale, 1 hour cache)
```typescript
// Achievement definitions rarely change
const { data } = useCachedQuery(['/api/gamification/achievements'], 'achievements');
```

**Rationale**: Achievement definitions are static. Aggressive caching reduces load.

### Leaderboard (5 min stale, 10 min cache)
```typescript
// Balance between freshness and performance
const { data } = useCachedQuery(['/api/gamification/leaderboard'], 'leaderboard');
```

**Rationale**: Leaderboard doesn't need real-time accuracy. Medium cache provides good UX.

### Analytics (10 min stale, 30 min cache)
```typescript
// Historical data doesn't change
const { data } = useAnalyticsQuery(['/api/progress', profileId, 'analytics']);
```

**Rationale**: Historical analytics are immutable. Longer cache is safe.

### Daily Challenges (5 min stale, 10 min cache)
```typescript
// Time-sensitive, needs to be relatively fresh
const { data } = useCachedQuery(['/api/gamification/daily-challenge'], 'dailyChallenge');
```

**Rationale**: Challenges reset daily. Medium cache with window focus refetch keeps it current.

### Static Data (1 hour stale, 24 hour cache)
```typescript
// Languages, system config - rarely changes
const { data } = useCachedQuery(['/api/languages'], 'static');
```

**Rationale**: Static reference data changes rarely. Aggressive caching minimizes API calls.

## Usage Examples

### Basic Query with Caching

```typescript
import { useCachedQuery } from '@/hooks/use-cached-query';

function MyComponent() {
  const { data, isLoading, error } = useCachedQuery(
    ['/api/lessons', lessonId],
    'lessons'
  );
  
  // Data shows cached version immediately if available
  // Fresh data fetches in background if stale
  return <div>{data?.title}</div>;
}
```

### Using Specialized Hooks

```typescript
import { useLessonQuery, useGamificationQuery } from '@/hooks/use-cached-query';

function Dashboard() {
  // Automatically uses lesson cache config
  const { data: lesson } = useLessonQuery(['/api/lessons/next', profileId]);
  
  // Automatically uses gamification cache config
  const { data: xp } = useGamificationQuery(['/api/gamification/xp']);
  
  return <div>...</div>;
}
```

### Cache Invalidation After Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateGamificationData, invalidateProgressData } from '@/lib/cacheUtils';

function LessonComplete() {
  const queryClient = useQueryClient();
  
  const completeMutation = useMutation({
    mutationFn: completeLesson,
    onSuccess: async () => {
      // Invalidate related caches
      await invalidateGamificationData(queryClient);
      await invalidateProgressData(queryClient, profileId);
    },
  });
  
  return <button onClick={() => completeMutation.mutate()}>Complete</button>;
}
```

### Optimistic Updates

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { optimisticallyUpdateXP } from '@/lib/cacheUtils';

function ExerciseSubmit() {
  const queryClient = useQueryClient();
  
  const submitMutation = useMutation({
    mutationFn: submitExercise,
    onMutate: async (variables) => {
      // Update UI immediately
      optimisticallyUpdateXP(queryClient, variables.expectedXP);
    },
    onError: () => {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/xp'] });
    },
  });
  
  return <button onClick={() => submitMutation.mutate({ expectedXP: 10 })}>Submit</button>;
}
```

### Prefetching for Better UX

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { prefetchNextLesson, prefetchLessonDetail } from '@/lib/cacheUtils';

function LessonCard({ lessonId, profileId }) {
  const queryClient = useQueryClient();
  
  return (
    <div
      onMouseEnter={() => {
        // Prefetch on hover for instant navigation
        prefetchLessonDetail(queryClient, lessonId);
      }}
    >
      <Link to={`/lessons/${lessonId}`}>View Lesson</Link>
    </div>
  );
}
```

## Query Key Factories

Use the provided query key factories for consistency:

```typescript
import { queryKeys } from '@/lib/cacheConfig';

// Lessons
queryKeys.lessons.all
queryKeys.lessons.detail(lessonId)
queryKeys.lessons.next(profileId)

// Gamification
queryKeys.gamification.xp
queryKeys.gamification.achievements
queryKeys.gamification.leaderboard({ language: 'spanish', period: 'weekly' })

// Progress
queryKeys.progress.overview(profileId)
queryKeys.progress.weaknesses(profileId)
queryKeys.progress.analytics(profileId, 'monthly')
```

## Best Practices

### 1. Choose the Right Cache Type

Match cache duration to data volatility:
- **Static data**: Use 'static' type (1 hour+)
- **User progress**: Use 'gamification' type (2-5 min)
- **Content**: Use 'lessons' or 'profiles' type (10-15 min)

### 2. Invalidate After Mutations

Always invalidate related queries after data changes:

```typescript
onSuccess: async () => {
  await invalidateGamificationData(queryClient);
  await invalidateProgressData(queryClient, profileId);
}
```

### 3. Use Optimistic Updates for Instant Feedback

For actions with predictable outcomes:

```typescript
onMutate: async () => {
  optimisticallyUpdateXP(queryClient, expectedXP);
}
```

### 4. Prefetch Predictable Navigation

Improve perceived performance:

```typescript
// Prefetch next lesson when viewing current lesson
useEffect(() => {
  prefetchNextLesson(queryClient, profileId);
}, [lessonId]);
```

### 5. Handle Loading and Error States

Always provide feedback:

```typescript
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
return <Content data={data} />;
```

## Performance Monitoring

### Check Cache Hit Rate

```typescript
// In development, log cache hits
const { data, dataUpdatedAt, isFetching } = useCachedQuery(...);

useEffect(() => {
  if (!isFetching && data) {
    console.log('Cache hit:', queryKey, 'age:', Date.now() - dataUpdatedAt);
  }
}, [isFetching, data, dataUpdatedAt]);
```

### Monitor Network Requests

Use browser DevTools Network tab to verify:
- Initial page load fetches data
- Subsequent navigations use cache
- Background refetches happen when data is stale

## Troubleshooting

### Data Not Updating

**Problem**: Cached data not refreshing after mutation

**Solution**: Ensure proper cache invalidation:
```typescript
await queryClient.invalidateQueries({ queryKey: ['/api/...'] });
```

### Too Many Requests

**Problem**: Excessive API calls

**Solution**: Increase staleTime or disable refetchOnWindowFocus:
```typescript
useCachedQuery(key, type, { refetchOnWindowFocus: false })
```

### Stale Data on Navigation

**Problem**: Old data shows when navigating back

**Solution**: Enable refetchOnMount:
```typescript
useCachedQuery(key, type, { refetchOnMount: true })
```

## Migration Guide

### Updating Existing Queries

**Before:**
```typescript
const { data } = useQuery({
  queryKey: ['/api/lessons', lessonId],
  staleTime: Infinity,
});
```

**After:**
```typescript
const { data } = useLessonQuery(['/api/lessons', lessonId]);
```

### Benefits

- ✅ Automatic cache configuration
- ✅ Consistent caching strategy
- ✅ Better user experience
- ✅ Reduced API load
- ✅ Instant feedback with optimistic updates

## Summary

The caching implementation provides:

1. **Immediate Response**: Cached data displays instantly
2. **Fresh Data**: Background refetches keep content current
3. **Reduced Load**: Fewer API calls improve performance
4. **Better UX**: Optimistic updates provide instant feedback
5. **Smart Invalidation**: Automatic cache updates after changes

This stale-while-revalidate pattern ensures users always see content immediately while the system keeps data fresh in the background.
