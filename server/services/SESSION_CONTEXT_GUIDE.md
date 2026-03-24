# Session Context Management Guide

## Overview

The SessionContextService provides comprehensive session management for AI interactions in LinguaMaster. It maintains conversation history, stores transcripts, and manages session lifecycle.

## Quick Start

### 1. Import the Service

```typescript
import { sessionContextService } from '../services/SessionContextService';
```

### 2. Create or Get a Session

```typescript
// Get existing active session or create new one
const sessionId = await sessionContextService.getOrCreateSessionContext({
  userId: user.id,
  sessionType: 'tutor', // or 'voice' or 'general'
  learningContext: {
    profileId: profile.id,
    proficiencyLevel: 'Intermediate',
    targetLanguage: 'Spanish',
    nativeLanguage: 'English',
  },
});
```

### 3. Add Messages to Conversation

```typescript
// Add user message
await sessionContextService.addMessageToHistory(sessionId, {
  role: 'user',
  content: 'How do I say "thank you" in Spanish?',
});

// Add AI response
await sessionContextService.addMessageToHistory(sessionId, {
  role: 'assistant',
  content: 'In Spanish, "thank you" is "gracias".',
});
```

### 4. Get Conversation History

```typescript
// Get last 10 messages for AI context
const history = await sessionContextService.getConversationHistory(sessionId, 10);

// Use history to provide context to AI
const aiResponse = await aiService.generateResponse(userQuestion, history);
```

### 5. End Session

```typescript
// End session and store transcript
const result = await sessionContextService.endSession(sessionId, {
  totalMessages: conversationHistory.length,
  duration: sessionDurationInSeconds,
  topics: ['greetings', 'basic phrases'],
  keyPoints: ['Learned common greetings', 'Practiced pronunciation'],
});
```

## Common Use Cases

### AI Tutor Integration

```typescript
// In AITeacherService
async answerQuestion(userId: string, question: string, context: LearningContext) {
  // Get or create session
  const sessionId = await sessionContextService.getOrCreateSessionContext({
    userId,
    sessionType: 'tutor',
    learningContext: context,
  });

  // Add user question
  await sessionContextService.addMessageToHistory(sessionId, {
    role: 'user',
    content: question,
  });

  // Get recent conversation for context
  const history = await sessionContextService.getConversationHistory(sessionId, 10);

  // Generate AI response with context
  const response = await this.generateResponse(question, history, context);

  // Add AI response
  await sessionContextService.addMessageToHistory(sessionId, {
    role: 'assistant',
    content: response,
  });

  return response;
}
```

### Voice Lesson Integration

```typescript
// In VoiceTeachingService
async processVoiceInput(userId: string, audioData: Buffer, context: LearningContext) {
  // Get or create voice session
  const sessionId = await sessionContextService.getOrCreateSessionContext({
    userId,
    sessionType: 'voice',
    learningContext: context,
  });

  // Transcribe audio
  const transcript = await whisperService.transcribe(audioData);

  // Add user speech to history
  await sessionContextService.addMessageToHistory(sessionId, {
    role: 'user',
    content: transcript,
    metadata: { audioProcessed: true },
  });

  // Get conversation context
  const history = await sessionContextService.getConversationHistory(sessionId, 5);

  // Generate contextual response
  const response = await this.generateVoiceResponse(transcript, history, context);

  // Add AI response
  await sessionContextService.addMessageToHistory(sessionId, {
    role: 'assistant',
    content: response,
  });

  return { transcript, response };
}
```

### Review Past Sessions

```typescript
// Get user's past tutor sessions
const tutorTranscripts = await sessionContextService.getPastTranscripts(userId, {
  sessionType: 'tutor',
  limit: 20,
  startDate: new Date('2024-01-01'),
});

// Display in UI
tutorTranscripts.forEach(transcript => {
  console.log(`Session: ${transcript.sessionId}`);
  console.log(`Date: ${transcript.startedAt}`);
  console.log(`Messages: ${transcript.messageCount}`);
  console.log(`Topics: ${transcript.summary?.topics.join(', ')}`);
});
```

## API Endpoints

### Session Management

```typescript
// Create new session
POST /api/sessions
Body: {
  sessionType: 'tutor' | 'voice' | 'general',
  learningContext: { ... },
  expirationHours?: number
}

// Get or create session
POST /api/sessions/get-or-create
Body: {
  sessionType: 'tutor' | 'voice' | 'general',
  learningContext: { ... }
}

// Get active sessions
GET /api/sessions/active

// Get session statistics
GET /api/sessions/statistics
```

### Conversation Management

```typescript
// Add message to history
POST /api/sessions/:sessionId/messages
Body: {
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: any
}

// Get conversation history
GET /api/sessions/:sessionId/history?limit=10

// Update learning context
PATCH /api/sessions/:sessionId/context
Body: { ...contextUpdates }
```

### Transcript Management

```typescript
// Store transcript
POST /api/sessions/:sessionId/transcript
Body: {
  summary?: {
    totalMessages: number,
    duration: number,
    topics: string[],
    keyPoints: string[]
  }
}

// Get past transcripts
GET /api/sessions/transcripts?sessionType=tutor&limit=20

// Get specific transcript
GET /api/sessions/:sessionId/transcript
```

### Session Lifecycle

```typescript
// End session
POST /api/sessions/:sessionId/end
Body: {
  summary?: { ... }
}

// Extend session expiration
POST /api/sessions/:sessionId/extend
Body: {
  additionalHours: number
}

// Clean up expired sessions (admin)
POST /api/sessions/cleanup
```

## Best Practices

### 1. Session Reuse
Always use `getOrCreateSessionContext()` to reuse active sessions:
```typescript
// ✅ Good - Reuses active session
const sessionId = await sessionContextService.getOrCreateSessionContext({...});

// ❌ Bad - Creates duplicate sessions
const { sessionId } = await sessionContextService.createSessionContext({...});
```

### 2. Conversation Context
Limit conversation history to recent messages for AI context:
```typescript
// ✅ Good - Last 10 messages provide sufficient context
const history = await sessionContextService.getConversationHistory(sessionId, 10);

// ❌ Bad - Full history may be too large for AI context window
const history = await sessionContextService.getConversationHistory(sessionId);
```

### 3. Session Cleanup
End sessions when user explicitly finishes:
```typescript
// ✅ Good - Explicitly end session
await sessionContextService.endSession(sessionId, summary);

// ⚠️ Acceptable - Let session expire naturally (24 hours)
// Sessions will be cleaned up automatically
```

### 4. Error Handling
Always handle session errors gracefully:
```typescript
try {
  await sessionContextService.addMessageToHistory(sessionId, message);
} catch (error) {
  if (error.message.includes('expired')) {
    // Create new session
    const newSessionId = await sessionContextService.createSessionContext({...});
  } else {
    // Handle other errors
    console.error('Session error:', error);
  }
}
```

### 5. Learning Context Updates
Update learning context as user progresses:
```typescript
// Update context when user completes a lesson
await sessionContextService.updateLearningContext(sessionId, {
  currentLesson: 'Advanced Grammar',
  recentTopics: [...existingTopics, 'subjunctive mood'],
});
```

## Configuration

### Session Expiration
Default: 24 hours
```typescript
// Use default (24 hours)
const { sessionId } = await sessionContextService.createSessionContext({...});

// Custom expiration (6 hours)
const { sessionId } = await sessionContextService.createSessionContext({
  ...,
  expirationHours: 6,
});
```

### History Trimming
Maximum: 100 messages per session
- Automatically trims to last 100 messages
- Prevents unbounded memory growth
- Oldest messages are removed first

### Cleanup Schedule
Recommended: Run cleanup daily
```typescript
// In a scheduled job (e.g., cron)
const result = await sessionContextService.cleanupExpiredSessions();
console.log(`Cleaned up ${result.deletedCount} expired sessions`);
console.log(`Archived ${result.archivedCount} sessions with history`);
```

## Troubleshooting

### Session Not Found
```typescript
// Check if session exists
const transcript = await sessionContextService.getSessionTranscript(sessionId);
if (!transcript) {
  console.log('Session not found or expired');
  // Create new session
}
```

### Session Expired
```typescript
// Extend expiration if needed
try {
  await sessionContextService.addMessageToHistory(sessionId, message);
} catch (error) {
  if (error.message.includes('expired')) {
    // Extend expiration
    await sessionContextService.extendSessionExpiration(sessionId, 12);
    // Retry
    await sessionContextService.addMessageToHistory(sessionId, message);
  }
}
```

### Too Many Messages
```typescript
// History is automatically trimmed to 100 messages
// No action needed - oldest messages are removed automatically
```

## Performance Tips

1. **Use Pagination**: When retrieving past transcripts, use limit and offset
2. **Index Usage**: Queries use indexes on userId and expiresAt
3. **Session Reuse**: Reuse active sessions to reduce database writes
4. **Batch Updates**: Update learning context in batches rather than per message
5. **Cleanup Schedule**: Run cleanup during off-peak hours

## Security Considerations

1. **Authentication**: All endpoints require authentication
2. **User Isolation**: Users can only access their own sessions
3. **Input Validation**: All inputs validated with Zod schemas
4. **SQL Injection**: Protected by Drizzle ORM
5. **Session Expiration**: Enforced at database and application level

## Related Services

- **AITeacherService**: Uses session context for Q&A continuity
- **VoiceTeachingService**: Maintains conversation context during voice lessons
- **SpeechService**: Can store pronunciation feedback in session metadata
- **AdaptiveLearningService**: Can use session data for learning pattern analysis

## Support

For issues or questions:
1. Check this guide first
2. Review implementation in `server/services/SessionContextService.ts`
3. Check API routes in `server/routes/sessions.ts`
4. Review tests in `server/services/SessionContextService.test.ts`
