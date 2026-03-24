# Database Transaction Implementation Guide

## Overview
This document provides a comprehensive guide to the database transaction implementation in the LinguaMaster platform, covering all services that perform multi-record operations.

## Quick Reference

### Transaction Utilities Location
`server/utils/transactions.ts`

### Services with Transaction Support
1. **CurriculumService** - Lesson completion with XP
2. **ExerciseService** - Exercise submission with XP
3. **GamificationService** - XP awards and achievement unlocks
4. **LearningProfileService** - Profile creation
5. **VoiceTeachingService** - Voice session completion with XP

## Transaction Functions

### withTransaction
Basic transaction wrapper with automatic rollback on error.

```typescript
import { withTransaction } from '../utils/transactions';

await withTransaction(async (tx) => {
  await tx.insert(table1).values(data1);
  await tx.update(table2).set(data2);
});
```

**Use when**: You need a simple transaction without retry logic.

### withRetry
Retry logic with exponential backoff (no transaction).

```typescript
import { withRetry } from '../utils/transactions';

await withRetry(async () => {
  await db.insert(table).values(data);
}, {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
});
```

**Use when**: You need retry logic for a single operation.

### withTransactionAndRetry (Recommended)
Combined transaction + retry for maximum reliability.

```typescript
import { withTransactionAndRetry } from '../utils/transactions';

await withTransactionAndRetry(async (tx) => {
  await tx.insert(table1).values(data1);
  await tx.update(table2).set(data2);
}, {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
});
```

**Use when**: You need atomic multi-record operations with retry support (most common).

### withSmartRetry
Intelligent retry that skips non-retryable errors.

```typescript
import { withSmartRetry } from '../utils/transactions';

await withSmartRetry(async () => {
  await db.insert(table).values(data);
}, {
  maxRetries: 3
});
```

**Use when**: You want to avoid retrying constraint violations.

## Configuration

### Default Options
```typescript
{
  maxRetries: 3,
  retryDelay: 1000, // milliseconds
  exponentialBackoff: true
}
```

### Exponential Backoff Schedule
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 second delay
- Attempt 4: 4 second delay

### Non-Retryable Errors
These errors fail immediately without retry:
- Unique constraint violations
- Foreign key constraint violations
- Check constraint violations
- Not null constraint violations
- Duplicate key errors

## Service Implementation Examples

### CurriculumService - Lesson Completion

```typescript
async markLessonComplete(params: {
  lessonId: string;
  profileId: string;
  metrics: PerformanceMetrics;
}): Promise<CompletionResult> {
  // Calculate XP
  const xpAwarded = calculateXP(params.metrics);

  // Atomic transaction
  const result = await withTransactionAndRetry(async (tx) => {
    // 1. Record completion
    await tx.insert(lessonCompletions).values({
      lessonId: params.lessonId,
      profileId: params.profileId,
      completedAt: new Date(),
      performanceMetrics: params.metrics,
      xpAwarded
    });

    // 2. Record XP gain
    await tx.insert(xpGains).values({
      userId: profile.userId,
      profileId: params.profileId,
      amount: xpAwarded,
      source: 'lesson',
      sourceId: params.lessonId,
      timestamp: new Date()
    });

    // 3. Update profile
    await tx.update(learningProfiles)
      .set({ 
        currentXP: profile.currentXP + xpAwarded,
        lastActivityDate: new Date()
      })
      .where(eq(learningProfiles.id, params.profileId));

    return { newXP: profile.currentXP + xpAwarded };
  });

  // Invalidate caches
  cache.delete(`lesson:next:${params.profileId}`);

  return { xpAwarded, profileUpdates: result };
}
```

**Key Points**:
- All 3 operations are atomic
- If any operation fails, all are rolled back
- Retry logic handles transient failures
- Cache invalidation happens after success

### ExerciseService - Exercise Submission

```typescript
async submitExercise(params: {
  exerciseId: string;
  profileId: string;
  userAnswer: string;
  timeTaken: number;
}): Promise<ExerciseResult> {
  const isCorrect = evaluateAnswer(params.userAnswer, exercise.correctAnswer);
  const xpAwarded = isCorrect ? calculateXP(exercise.difficulty) : 0;

  if (isCorrect && xpAwarded > 0) {
    // Use transaction for correct answers with XP
    await withTransactionAndRetry(async (tx) => {
      await tx.insert(exerciseSubmissions).values({...});
      await tx.insert(xpGains).values({...});
      await tx.update(learningProfiles).set({...});
    });
  } else {
    // Just record submission for incorrect answers
    await db.insert(exerciseSubmissions).values({...});
  }

  return { isCorrect, xpAwarded, feedback };
}
```

**Key Points**:
- Transaction only for correct answers (with XP)
- Incorrect answers just record submission
- Optimizes performance for common case

### GamificationService - XP Award

```typescript
async awardXP(params: {
  userId: string;
  amount: number;
  source: string;
}): Promise<number> {
  const newXP = await withTransactionAndRetry(async (tx) => {
    // 1. Record XP gain
    await tx.insert(xpGains).values({
      userId: params.userId,
      amount: params.amount,
      source: params.source,
      timestamp: new Date()
    });

    // 2. Update user total
    const user = await tx.query.users.findFirst({
      where: eq(users.id, params.userId)
    });
    const updatedXP = user.xp + params.amount;
    
    await tx.update(users)
      .set({ xp: updatedXP })
      .where(eq(users.id, params.userId));

    return updatedXP;
  });

  return newXP;
}
```

**Key Points**:
- XP gain and user update are atomic
- Returns new total XP
- Can be called from other services

### VoiceTeachingService - Session End

```typescript
async endVoiceSession(params: {
  sessionId: string;
  profileId: string;
}): Promise<SessionResult> {
  const xpAwarded = calculateSessionXP(session);

  await withTransactionAndRetry(async (tx) => {
    // 1. Update session
    await tx.update(voiceSessions)
      .set({ endedAt: new Date(), xpAwarded })
      .where(eq(voiceSessions.id, params.sessionId));

    // 2. Record XP gain
    await tx.insert(xpGains).values({
      userId: profile.userId,
      profileId: params.profileId,
      amount: xpAwarded,
      source: 'voice',
      sourceId: params.sessionId,
      timestamp: new Date()
    });

    // 3. Update profile
    await tx.update(learningProfiles)
      .set({
        currentXP: profile.currentXP + xpAwarded,
        lastActivityDate: new Date()
      })
      .where(eq(learningProfiles.id, params.profileId));
  });

  return { xpAwarded, transcript: session.conversationHistory };
}
```

**Key Points**:
- Session end, XP gain, and profile update are atomic
- Ensures consistent state even if operation is interrupted
- Retry handles network issues

## Error Handling

### Transaction Failures
```typescript
try {
  await withTransactionAndRetry(async (tx) => {
    // operations
  });
} catch (error) {
  // All operations rolled back
  // Error logged with context
  // Re-throw to caller
  throw error;
}
```

### Retry Exhaustion
After max retries, the last error is thrown with full context:
```
Database operation failed after 4 attempts: Connection timeout
```

### Non-Retryable Errors
Constraint violations fail immediately:
```
Non-retryable error encountered: unique constraint violation
```

## Testing

### Unit Tests
`server/utils/transactions.test.ts` - 13 tests
- Transaction execution and rollback
- Retry logic with exponential backoff
- Combined transaction + retry
- Error classification

### Verification Tests
`server/services/transaction-verification.test.ts` - 16 tests
- Service method availability
- Service initialization
- Transaction utility imports

### Integration Tests
`server/services/transactions.integration.test.ts`
- End-to-end transaction testing
- Data consistency verification
- Referential integrity checks
- Requires live database

## Performance Considerations

### Transaction Duration
Keep transactions as short as possible:
- ✅ Good: Insert/update operations only
- ❌ Bad: AI service calls inside transactions
- ❌ Bad: Long-running computations

### Retry Impact
- Exponential backoff prevents database overload
- Smart retry skips non-retryable errors
- Max 3 retries prevents infinite loops

### Caching
- Invalidate caches after successful transactions
- Prevents stale data
- Maintains consistency

## Monitoring and Debugging

### Logging
All transaction operations log:
- Operation start/end
- Retry attempts with delays
- Errors with stack traces
- Success confirmations

### Example Logs
```
[CurriculumService] Marking lesson abc123 complete for profile xyz789
Database operation failed (attempt 1/4): Connection timeout. Retrying in 1000ms...
Database operation failed (attempt 2/4): Connection timeout. Retrying in 2000ms...
[CurriculumService] Lesson completed, awarded 142 XP
```

### Metrics to Monitor
1. Transaction success rate
2. Average retry count
3. Transaction duration
4. Error frequency by type

## Best Practices

### DO
✅ Use `withTransactionAndRetry` for multi-record operations
✅ Keep transactions short and focused
✅ Invalidate caches after successful transactions
✅ Log all transaction operations
✅ Handle errors appropriately
✅ Test with both success and failure scenarios

### DON'T
❌ Call AI services inside transactions
❌ Perform long computations in transactions
❌ Nest transactions unnecessarily
❌ Ignore transaction errors
❌ Retry non-retryable errors
❌ Leave transactions open indefinitely

## Troubleshooting

### Problem: Transaction Timeout
**Cause**: Transaction taking too long
**Solution**: Move non-database operations outside transaction

### Problem: Deadlock
**Cause**: Multiple transactions waiting for each other
**Solution**: Ensure consistent operation order across services

### Problem: Constraint Violation
**Cause**: Data integrity issue
**Solution**: Validate data before transaction, don't retry

### Problem: Connection Pool Exhausted
**Cause**: Too many concurrent transactions
**Solution**: Increase pool size or reduce concurrency

## Future Enhancements

### Planned Improvements
1. **Transaction Monitoring**: Real-time metrics dashboard
2. **Deadlock Detection**: Automatic detection and resolution
3. **Transaction Timeouts**: Configurable timeouts per operation
4. **Distributed Transactions**: Support for multi-database operations
5. **Savepoints**: Nested transaction support

### Performance Optimizations
1. **Batch Operations**: Combine multiple inserts
2. **Read Replicas**: Separate read/write operations
3. **Connection Pooling**: Optimize pool configuration
4. **Query Optimization**: Index and query improvements

## Support

### Documentation
- Implementation Summary: `task-25.2-implementation-summary.md`
- Checklist: `task-25.2-checklist.md`
- This Guide: `TRANSACTION_IMPLEMENTATION.md`

### Code References
- Transaction Utilities: `server/utils/transactions.ts`
- Unit Tests: `server/utils/transactions.test.ts`
- Integration Tests: `server/services/transactions.integration.test.ts`

### Requirements
- 19.4: Database transactions for multi-record operations
- 19.6: Retry logic for failed database writes
- 25.2: Data consistency through atomic operations

## Conclusion

The transaction implementation provides:
- ✅ Data consistency through atomic operations
- ✅ Reliability through retry logic
- ✅ Performance through smart retry and caching
- ✅ Maintainability through comprehensive testing
- ✅ Observability through detailed logging

All services that perform multi-record operations now use transactions to ensure data integrity and consistency across the platform.
