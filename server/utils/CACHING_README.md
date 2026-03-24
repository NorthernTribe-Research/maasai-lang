# Backend Caching Implementation

## Overview

This document describes the backend caching implementation for the LinguaMaster AI Platform. The caching system is designed to reduce AI service calls, improve response times, and optimize database queries.

**Requirements:** 23.2

## Architecture

### Cache Infrastructure

The caching system uses an in-memory cache implemented in `server/utils/cache.ts`. The cache provides:

- **TTL-based expiration**: Different cache types have different time-to-live values
- **Cache statistics**: Hit/miss tracking and hit rate calculation
- **Pattern-based invalidation**: Ability to invalidate multiple cache entries at once
- **Automatic cleanup**: Expired entries are removed periodically

### Cache Types and TTL

| Cache Type | TTL | Description |
|------------|-----|-------------|
| AI_CONTENT | 1 hour | AI-generated curriculum and lesson content |
| CURRICULUM | 24 hours | Curriculum data (relatively static) |
| LESSON | 12 hours | Individual lesson content |
| EXERCISE | 30 minutes | Generated exercise data |
| USER_PROFILE | 5 minutes | User profile data |
| DEFAULT | 5 minutes | Default TTL for other data |

## Cached Operations

### 1. AI-Generated Content

#### Curriculum Generation (GeminiService)
- **Cache Key Pattern**: `ai:curriculum:{targetLanguage}:{nativeLanguage}:{proficiencyLevel}`
- **TTL**: 1 hour
- **Benefit**: Reduces expensive AI calls for common language/level combinations

```typescript
// Example usage
const curriculum = await geminiService.generateCurriculum({
  targetLanguage: 'Spanish',
  nativeLanguage: 'English',
  proficiencyLevel: 'Beginner'
});
// Subsequent calls with same parameters return cached result
```

#### Lesson Generation (GeminiService)
- **Cache Key Pattern**: `ai:lesson:{targetLanguage}:{topic}:{proficiencyLevel}`
- **TTL**: 1 hour
- **Benefit**: Reuses lesson content for common topics

#### Exercise Generation (OpenAIService)
- **Cache Key Pattern**: `ai:exercises:{targetLanguage}:{proficiencyLevel}:{weaknessTopics}:{count}`
- **TTL**: 30 minutes
- **Benefit**: Reduces OpenAI API calls for similar exercise requests

### 2. Curriculum Data

#### Learning Path Generation (CurriculumService)
- **Cache Key Pattern**: `curriculum:generate:{profileId}:{targetLanguage}`
- **TTL**: 24 hours
- **Benefit**: Avoids regenerating entire curriculum for profile

#### Next Lesson Retrieval (CurriculumService)
- **Cache Key Pattern**: `lesson:next:{profileId}`
- **TTL**: 12 hours
- **Benefit**: Speeds up lesson navigation
- **Invalidation**: Cleared when lesson is completed

#### Lesson by ID (CurriculumService)
- **Cache Key Pattern**: `lesson:{lessonId}`
- **TTL**: 12 hours
- **Benefit**: Reduces database queries for frequently accessed lessons

### 3. Database Query Caching

The following database queries are cached:
- Learning profile lookups
- Curriculum retrieval
- Lesson content
- Completed lesson tracking

## Cache Invalidation Strategies

### Automatic Invalidation

Cache entries are automatically invalidated when:

1. **Lesson Completion**: When a user completes a lesson
   - Invalidates: `lesson:next:{profileId}`
   - Invalidates: `profile:{profileId}`

2. **TTL Expiration**: Entries expire based on their TTL
   - Cleanup runs every 10 minutes
   - Expired entries are removed automatically

### Manual Invalidation

#### Profile-Based Invalidation
```typescript
cache.invalidateProfile(profileId);
// Invalidates all cache entries for a specific profile:
// - profile:{profileId}*
// - curriculum:{profileId}*
// - lesson:*:{profileId}*
```

#### Curriculum-Based Invalidation
```typescript
cache.invalidateCurriculum(curriculumId);
// Invalidates all cache entries for a specific curriculum:
// - curriculum:{curriculumId}*
// - lesson:{curriculumId}*
```

#### Pattern-Based Invalidation
```typescript
cache.deletePattern('^ai:curriculum:Spanish');
// Invalidates all Spanish curriculum cache entries
```

## Cache Management API

### Endpoints

#### Get Cache Statistics
```http
GET /api/cache/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "stats": {
    "hits": 1250,
    "misses": 180,
    "size": 45,
    "hitRate": 87.41
  }
}
```

#### Clear All Cache
```http
POST /api/cache/clear
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

#### Invalidate by Pattern
```http
POST /api/cache/invalidate
Authorization: Bearer {token}
Content-Type: application/json

{
  "pattern": "^ai:curriculum:Spanish"
}

Response:
{
  "success": true,
  "message": "Invalidated 5 cache entries",
  "deleted": 5
}
```

#### Invalidate Profile Cache
```http
POST /api/cache/invalidate/profile/{profileId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Invalidated cache for profile {profileId}"
}
```

#### Invalidate Curriculum Cache
```http
POST /api/cache/invalidate/curriculum/{curriculumId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Invalidated cache for curriculum {curriculumId}"
}
```

## Monitoring and Logging

### Cache Hit/Miss Logging

The cache logs all hits and misses to the console:

```
[Cache HIT] ai:curriculum:Spanish:English:Beginner
[Cache MISS] lesson:next:user-123
```

### Statistics Logging

Cache statistics are logged every hour:

```
[Cache Stats] {
  hits: 1250,
  misses: 180,
  size: 45,
  hitRate: '87.41%'
}
```

### Cleanup Logging

Cleanup operations log the number of expired entries removed:

```
[Cache] Cleaned 12 expired entries
```

## Performance Benefits

### Expected Improvements

1. **AI Service Calls**: 60-80% reduction in duplicate AI requests
2. **Response Times**: 
   - Cached curriculum: ~5ms vs ~2000ms (400x faster)
   - Cached lessons: ~3ms vs ~500ms (166x faster)
   - Cached exercises: ~4ms vs ~1500ms (375x faster)
3. **Database Load**: 40-60% reduction in lesson/curriculum queries

### Cache Hit Rate Targets

- **AI Content**: 70-80% (common language/level combinations)
- **Curriculum Data**: 85-95% (relatively static)
- **Lesson Content**: 80-90% (frequently accessed)

## Best Practices

### When to Use Cache

✅ **DO cache:**
- AI-generated content that can be reused
- Relatively static data (curriculum, lessons)
- Frequently accessed database queries
- Expensive computations

❌ **DON'T cache:**
- User-specific real-time data (current progress)
- Authentication tokens
- Session-specific data
- Frequently changing data

### Cache Key Design

Good cache keys are:
- **Unique**: Include all parameters that affect the result
- **Consistent**: Same parameters always produce same key
- **Readable**: Easy to understand and debug
- **Pattern-friendly**: Support pattern-based invalidation

Example:
```typescript
// Good
const key = `ai:curriculum:${language}:${level}`;

// Bad (not unique enough)
const key = `curriculum:${language}`;
```

### Invalidation Strategy

1. **Invalidate on write**: Clear related cache when data changes
2. **Use TTL**: Set appropriate expiration times
3. **Pattern invalidation**: Group related entries for bulk invalidation
4. **Monitor hit rates**: Adjust TTL based on actual usage patterns

## Troubleshooting

### Low Hit Rate

If cache hit rate is below 50%:
1. Check if cache keys are consistent
2. Verify TTL is not too short
3. Review invalidation logic (may be too aggressive)
4. Check if data is actually reusable

### High Memory Usage

If cache size grows too large:
1. Reduce TTL for less critical data
2. Implement size-based eviction (LRU)
3. Review what's being cached
4. Consider external cache (Redis) for production

### Stale Data Issues

If users see outdated content:
1. Reduce TTL for affected cache type
2. Add invalidation on data updates
3. Review cache key uniqueness
4. Consider cache versioning

## Future Enhancements

### Potential Improvements

1. **Redis Integration**: For distributed caching in production
2. **Cache Warming**: Pre-populate cache with common requests
3. **LRU Eviction**: Implement size-based cache limits
4. **Cache Versioning**: Support cache schema migrations
5. **Metrics Dashboard**: Real-time cache performance visualization
6. **Smart TTL**: Adjust TTL based on access patterns
7. **Compression**: Compress large cached values

### Migration to Redis

For production deployment, consider migrating to Redis:

```typescript
// Example Redis integration
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

class RedisCache {
  async set(key: string, value: any, ttl: number) {
    await redis.setex(key, ttl / 1000, JSON.stringify(value));
  }
  
  async get(key: string) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }
}
```

## Testing

### Manual Testing

Test cache functionality:

```bash
# Generate curriculum (cache miss)
curl -X POST http://localhost:5000/api/curriculum/generate \
  -H "Authorization: Bearer {token}" \
  -d '{"profileId": "123", "targetLanguage": "Spanish", "nativeLanguage": "English"}'

# Generate same curriculum again (cache hit)
curl -X POST http://localhost:5000/api/curriculum/generate \
  -H "Authorization: Bearer {token}" \
  -d '{"profileId": "123", "targetLanguage": "Spanish", "nativeLanguage": "English"}'

# Check cache stats
curl http://localhost:5000/api/cache/stats \
  -H "Authorization: Bearer {token}"
```

### Monitoring Cache Performance

```typescript
// Get cache statistics
const stats = cache.getStats();
console.log(`Hit Rate: ${stats.hitRate.toFixed(2)}%`);
console.log(`Cache Size: ${stats.size} entries`);
```

## Conclusion

The backend caching implementation provides significant performance improvements by:
- Reducing expensive AI service calls
- Minimizing database queries
- Improving response times
- Providing flexible invalidation strategies

Monitor cache statistics regularly and adjust TTL values based on actual usage patterns to optimize performance.
