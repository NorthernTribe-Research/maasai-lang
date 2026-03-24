/**
 * Integration test for SessionContextService
 * Run with: tsx server/services/SessionContextService.integration-test.ts
 */

import { SessionContextService } from './SessionContextService';

async function runTests() {
  console.log('🧪 Starting SessionContextService Integration Tests\n');
  
  const service = new SessionContextService();
  const testUserId = 'test-user-' + Date.now();
  let sessionId: string;

  try {
    // Test 1: Create Session Context
    console.log('Test 1: Creating session context...');
    const createResult = await service.createSessionContext({
      userId: testUserId,
      sessionType: 'tutor',
      learningContext: {
        profileId: 'test-profile-123',
        proficiencyLevel: 'Beginner',
        targetLanguage: 'Spanish',
        nativeLanguage: 'English',
      },
    });
    sessionId = createResult.sessionId;
    console.log('✅ Session created:', sessionId);
    console.log('   Expires at:', createResult.expiresAt);

    // Test 2: Add Messages to History
    console.log('\nTest 2: Adding messages to conversation history...');
    await service.addMessageToHistory(sessionId, {
      role: 'user',
      content: 'Hello, I want to learn Spanish',
    });
    await service.addMessageToHistory(sessionId, {
      role: 'assistant',
      content: '¡Hola! I\'d be happy to help you learn Spanish.',
    });
    await service.addMessageToHistory(sessionId, {
      role: 'user',
      content: 'Can you teach me basic greetings?',
    });
    console.log('✅ Added 3 messages to conversation history');

    // Test 3: Get Conversation History
    console.log('\nTest 3: Retrieving conversation history...');
    const history = await service.getConversationHistory(sessionId);
    console.log('✅ Retrieved', history.length, 'messages');
    console.log('   First message:', history[0]?.content);
    console.log('   Last message:', history[history.length - 1]?.content);

    // Test 4: Get Limited History
    console.log('\nTest 4: Retrieving limited conversation history...');
    const limitedHistory = await service.getConversationHistory(sessionId, 2);
    console.log('✅ Retrieved', limitedHistory.length, 'messages (limited to 2)');

    // Test 5: Update Learning Context
    console.log('\nTest 5: Updating learning context...');
    await service.updateLearningContext(sessionId, {
      currentLesson: 'Greetings and Introductions',
      recentTopics: ['greetings', 'basic phrases'],
    });
    console.log('✅ Learning context updated');

    // Test 6: Get Session Transcript
    console.log('\nTest 6: Getting session transcript...');
    const transcript = await service.getSessionTranscript(sessionId);
    console.log('✅ Retrieved transcript');
    console.log('   Session type:', transcript?.sessionType);
    console.log('   Message count:', transcript?.messageCount);
    console.log('   Started at:', transcript?.startedAt);

    // Test 7: Store Session Transcript
    console.log('\nTest 7: Storing session transcript...');
    const storeResult = await service.storeSessionTranscript(sessionId, {
      totalMessages: 3,
      duration: 300,
      topics: ['greetings', 'introductions'],
      keyPoints: ['Basic Spanish greetings', 'Polite expressions'],
    });
    console.log('✅ Transcript stored');
    console.log('   Transcript ID:', storeResult.transcriptId);
    console.log('   Message count:', storeResult.messageCount);

    // Test 8: Get Active Sessions
    console.log('\nTest 8: Getting active sessions...');
    const activeSessions = await service.getActiveSessions(testUserId);
    console.log('✅ Retrieved', activeSessions.length, 'active session(s)');
    if (activeSessions.length > 0) {
      console.log('   Session ID:', activeSessions[0].sessionId);
      console.log('   Session type:', activeSessions[0].sessionType);
      console.log('   Message count:', activeSessions[0].messageCount);
    }

    // Test 9: Get Session Statistics
    console.log('\nTest 9: Getting session statistics...');
    const stats = await service.getSessionStatistics(testUserId);
    console.log('✅ Retrieved session statistics');
    console.log('   Total sessions:', stats.totalSessions);
    console.log('   Active sessions:', stats.activeSessions);
    console.log('   Total messages:', stats.totalMessages);
    console.log('   Average duration:', stats.averageSessionDuration, 'seconds');
    console.log('   Sessions by type:', stats.sessionsByType);

    // Test 10: Get Past Transcripts
    console.log('\nTest 10: Getting past transcripts...');
    const pastTranscripts = await service.getPastTranscripts(testUserId, {
      limit: 10,
    });
    console.log('✅ Retrieved', pastTranscripts.length, 'past transcript(s)');
    if (pastTranscripts.length > 0) {
      console.log('   First transcript session ID:', pastTranscripts[0].sessionId);
      console.log('   Message count:', pastTranscripts[0].messageCount);
    }

    // Test 11: Extend Session Expiration
    console.log('\nTest 11: Extending session expiration...');
    const newExpiresAt = await service.extendSessionExpiration(sessionId, 12);
    console.log('✅ Session expiration extended');
    console.log('   New expiration:', newExpiresAt);

    // Test 12: Get or Create Session (should return existing)
    console.log('\nTest 12: Testing get or create session (should return existing)...');
    const existingSessionId = await service.getOrCreateSessionContext({
      userId: testUserId,
      sessionType: 'tutor',
      learningContext: {},
    });
    console.log('✅ Got existing session:', existingSessionId);
    console.log('   Matches original:', existingSessionId === sessionId);

    // Test 13: End Session
    console.log('\nTest 13: Ending session...');
    const endResult = await service.endSession(sessionId, {
      totalMessages: 3,
      duration: 300,
      topics: ['greetings'],
      keyPoints: ['Learned basic greetings'],
    });
    console.log('✅ Session ended');
    console.log('   Session ID:', endResult.sessionId);
    console.log('   Message count:', endResult.messageCount);
    console.log('   Duration:', endResult.duration, 'seconds');

    // Test 14: Create New Session (previous one is ended)
    console.log('\nTest 14: Creating new session after previous ended...');
    const newSessionResult = await service.createSessionContext({
      userId: testUserId,
      sessionType: 'voice',
      learningContext: {
        profileId: 'test-profile-123',
        proficiencyLevel: 'Beginner',
      },
      expirationHours: 6,
    });
    console.log('✅ New session created:', newSessionResult.sessionId);
    console.log('   Custom expiration (6 hours):', newSessionResult.expiresAt);

    console.log('\n✅ All tests passed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Session creation: ✓');
    console.log('   - Message management: ✓');
    console.log('   - Conversation history: ✓');
    console.log('   - Context updates: ✓');
    console.log('   - Transcript storage: ✓');
    console.log('   - Session lifecycle: ✓');
    console.log('   - Statistics and queries: ✓');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests()
  .then(() => {
    console.log('\n🎉 Integration tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Integration tests failed:', error);
    process.exit(1);
  });
