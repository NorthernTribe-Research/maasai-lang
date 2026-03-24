# TanStack Query Caching - Quick Examples

## Quick Start

### 1. Basic Cached Query

```typescript
import { useCachedQuery } from '@/hooks/use-cached-query';
import { queryKeys } from '@/lib/cacheConfig';

function MyComponent() {
  const { data, isLoading } = useCachedQuery(
    queryKeys.gamification.xp,
    'gamification' // Automatically uses 2min stale, 5min cache
  );

  if (isLoading) return <Skeleton />;
  return <div>XP: {data.totalXP}</div>;
}
```

### 2. Using Specialized Hooks

```typescript
import { useGamificationQuery } from '@/hooks/use-cached-query';
import { queryKeys } from '@/lib/cacheConfig';

function XPComponent() {
  // Automatically configured for gamification data
  const { data } = useGamificationQuery(queryKeys.gamification.xp);
  return <div>XP: {data?.totalXP}</div>;
}
```

### 3. Mutation with Cache Invalidation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateGamificationData } from '@/lib/cacheUtils';

function CompleteLesson() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: completeLesson,
    onSuccess: async () => {
      // Invalidate all gamification caches
      await invalidateGamificationData(queryClient);
    },
  });

  return <button onClick={() => mutation.mutate()}>Complete</button>;
}
```

### 4. Optimistic Update

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { optimisticallyUpdateXP } from '@/lib/cacheUtils';

function SubmitExercise() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: submitExercise,
    onMutate: async (variables) => {
      // Update UI immediately
      optimisticallyUpdateXP(queryClient, variables.expectedXP);
    },
    onError: () => {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.xp });
    },
  });

  return <button onClick={() => mutation.mutate({ expectedXP: 10 })}>Submit</button>;
}
```

### 5. Prefetching

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { prefetchLessonDetail } from '@/lib/cacheUtils';

function LessonCard({ lessonId }) {
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

## Common Patterns

### Pattern 1: Dashboard with Multiple Queries

```typescript
import { useGamificationQuery, useProfileQuery } from '@/hooks/use-cached-query';
import { queryKeys } from '@/lib/cacheConfig';

function Dashboard() {
  const { data: xp } = useGamificationQuery(queryKeys.gamification.xp);
  const { data: streak } = useGamificationQuery(queryKeys.gamification.streak);
  const { data: profile } = useProfileQuery(queryKeys.profiles.detail(profileId));

  return (
    <div>
      <XPDisplay data={xp} />
      <StreakTracker data={streak} />
      <ProfileCard data={profile} />
    </div>
  );
}
```

### Pattern 2: List with Detail Prefetch

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useLessonQuery } from '@/hooks/use-cached-query';
import { prefetchLessonDetail } from '@/lib/cacheUtils';
import { queryKeys } from '@/lib/cacheConfig';

function LessonList({ profileId }) {
  const queryClient = useQueryClient();
  const { data: lessons } = useLessonQuery(queryKeys.lessons.list(profileId));

  return (
    <div>
      {lessons?.map(lesson => (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          onMouseEnter={() => prefetchLessonDetail(queryClient, lesson.id)}
        />
      ))}
    </div>
  );
}
```

### Pattern 3: Form with Optimistic Update

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setCachedData } from '@/lib/cacheUtils';
import { queryKeys } from '@/lib/cacheConfig';

function UpdateProfile() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateProfile,
    onMutate: async (newProfile) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.profiles.detail(profileId) });

      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.profiles.detail(profileId));

      // Optimistically update
      setCachedData(queryClient, queryKeys.profiles.detail(profileId), newProfile);

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        setCachedData(queryClient, queryKeys.profiles.detail(profileId), context.previous);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(profileId) });
    },
  });

  return <form onSubmit={(e) => mutation.mutate(formData)}>...</form>;
}
```

### Pattern 4: Dependent Queries

```typescript
import { useLessonQuery, useProfileQuery } from '@/hooks/use-cached-query';
import { queryKeys } from '@/lib/cacheConfig';

function LessonViewer({ lessonId }) {
  // First query
  const { data: profile } = useProfileQuery(queryKeys.profiles.detail(profileId));

  // Second query depends on first
  const { data: lesson } = useLessonQuery(
    queryKeys.lessons.detail(lessonId),
    {
      enabled: !!profile, // Only run when profile is loaded
    }
  );

  return <div>...</div>;
}
```

### Pattern 5: Polling with Cache

```typescript
import { useGamificationQuery } from '@/hooks/use-cached-query';
import { queryKeys } from '@/lib/cacheConfig';

function LiveLeaderboard() {
  const { data } = useGamificationQuery(
    queryKeys.gamification.leaderboard(),
    {
      refetchInterval: 30000, // Poll every 30 seconds
      refetchIntervalInBackground: false, // Stop when tab is hidden
    }
  );

  return <LeaderboardTable data={data} />;
}
```

## Migration Checklist

When updating an existing component:

- [ ] Import `useCachedQuery` or specialized hook
- [ ] Import `queryKeys` from cacheConfig
- [ ] Replace `useQuery` with cached version
- [ ] Use query key factory instead of string
- [ ] Add cache invalidation in mutations
- [ ] Consider optimistic updates for instant feedback
- [ ] Add prefetching if beneficial
- [ ] Test cache behavior (see cached data immediately)

## Testing Cache Behavior

### Test 1: Verify Cached Data Shows Immediately

1. Navigate to page with cached query
2. Navigate away
3. Navigate back
4. **Expected:** Data shows immediately (no loading state)
5. **Check:** Network tab shows background refetch if data is stale

### Test 2: Verify Stale-While-Revalidate

1. View XP display (fresh data)
2. Wait 2+ minutes (past staleTime)
3. Navigate away and back
4. **Expected:** Cached XP shows immediately
5. **Expected:** Network request fires in background
6. **Expected:** UI updates when fresh data arrives

### Test 3: Verify Window Focus Refetch

1. Open dashboard
2. Switch to another tab for 3+ minutes
3. Return to dashboard
4. **Expected:** Cached data shows immediately
5. **Expected:** Background refetch fires
6. **Check:** Network tab for refetch request

### Test 4: Verify Optimistic Update

1. Complete an exercise
2. **Expected:** XP updates immediately in UI
3. **Expected:** No loading state
4. **Check:** Network request confirms update

## Troubleshooting

### Issue: Data not updating after mutation

**Solution:** Add cache invalidation
```typescript
onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: [...] });
}
```

### Issue: Too many API requests

**Solution:** Increase staleTime or disable refetchOnWindowFocus
```typescript
useCachedQuery(key, type, { 
  staleTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false 
})
```

### Issue: Stale data showing

**Solution:** Decrease staleTime or force refetch
```typescript
useCachedQuery(key, type, { 
  staleTime: 1 * 60 * 1000, // 1 minute
  refetchOnMount: true 
})
```

### Issue: Cache not shared between components

**Solution:** Use consistent query keys via factories
```typescript
// ✅ Good - uses factory
queryKeys.lessons.detail(lessonId)

// ❌ Bad - inconsistent keys
['/api/lessons', lessonId]
['/api/lessons/' + lessonId]
```

## Best Practices Summary

1. ✅ Use query key factories for consistency
2. ✅ Choose appropriate cache type for data volatility
3. ✅ Invalidate caches after mutations
4. ✅ Use optimistic updates for instant feedback
5. ✅ Prefetch predictable navigation
6. ✅ Handle loading and error states
7. ✅ Test cache behavior in development
8. ✅ Monitor network requests to verify caching

## Quick Reference

| Hook | Cache Duration | Use For |
|------|---------------|---------|
| `useLessonQuery` | 15 min | Lesson content |
| `useProfileQuery` | 10 min | User profiles |
| `useGamificationQuery` | 2 min | XP, streaks, achievements |
| `useAnalyticsQuery` | 10 min | Progress analytics |
| `useCachedQuery` | Custom | Any data type |

| Utility | Purpose |
|---------|---------|
| `invalidateGamificationData` | Refresh XP, achievements, streaks |
| `invalidateProgressData` | Refresh progress stats |
| `invalidateLessonData` | Refresh lesson lists |
| `prefetchNextLesson` | Preload next lesson |
| `prefetchLessonDetail` | Preload lesson on hover |
| `optimisticallyUpdateXP` | Instant XP feedback |
| `optimisticallyUpdateStreak` | Instant streak feedback |
