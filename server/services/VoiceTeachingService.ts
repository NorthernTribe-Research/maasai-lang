import { BaseService } from './BaseService';
import { geminiService } from './GeminiService';
import { WhisperService } from './WhisperService';
import { aiServiceMonitor } from './AIServiceMonitor';
import { db } from '../db';
import { voiceSessions, learningProfiles, xpGains, VoiceSession } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { withTransactionAndRetry } from '../utils/transactions';

const whisperService = new WhisperService();

/**
 * Voice Teaching Service for interactive voice-based lessons
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
export class VoiceTeachingService extends BaseService {
  constructor() {
    super();
    this.log("VoiceTeachingService initialized", "info");
  }

  /**
   * Start a new voice teaching session
   * Requirements: 7.1, 7.2
   */
  async startVoiceSession(params: {
    profileId: string;
    targetLanguage: string;
    proficiencyLevel: string;
    topic: string;
  }): Promise<{
    sessionId: string;
    initialPrompt: string;
  }> {
    try {
      this.log(`Starting voice session for profile ${params.profileId}`, "info");

      // Create voice session
      const [session] = await db.insert(voiceSessions).values({
        profileId: params.profileId,
        startedAt: new Date(),
        conversationHistory: [],
        totalTurns: 0,
        xpAwarded: 0
      }).returning();

      // Generate initial prompt using AI
      const initialPrompt = await aiServiceMonitor.executeWithMonitoring(
        'gemini',
        async () => {
          const response = await geminiService.generateConversationResponse({
            conversationHistory: [],
            userInput: `START_SESSION: ${params.topic}`,
            proficiencyLevel: params.proficiencyLevel,
            language: params.targetLanguage
          });
          return response;
        }
      );

      // Update session with initial prompt
      const conversationHistory = [
        {
          role: 'assistant',
          content: initialPrompt,
          timestamp: new Date().toISOString()
        }
      ];

      await db.update(voiceSessions)
        .set({ conversationHistory })
        .where(eq(voiceSessions.id, session.id));

      this.log(`Voice session ${session.id} started`, "info");

      return {
        sessionId: session.id,
        initialPrompt
      };
    } catch (error) {
      throw this.handleError(error, "VoiceTeachingService.startVoiceSession");
    }
  }

  /**
   * Process voice input from learner
   * Requirements: 7.3, 7.4, 7.5, 7.6
   */
  async processVoiceInput(params: {
    sessionId: string;
    audioData: Buffer;
    targetLanguage: string;
    proficiencyLevel: string;
  }): Promise<{
    transcript: string;
    response: string;
    corrections: string[];
    feedback: string;
  }> {
    try {
      this.log(`Processing voice input for session ${params.sessionId}`, "info");

      // Get session
      const session = await db.query.voiceSessions.findFirst({
        where: eq(voiceSessions.id, params.sessionId)
      });

      if (!session) {
        throw new Error("Voice session not found");
      }

      // Transcribe audio using Whisper
      let transcript = "";
      try {
        const transcription = await whisperService.transcribeAudio(params.audioData, {
          language: this.getLanguageCode(params.targetLanguage),
          responseFormat: 'text'
        });
        transcript = transcription.text;
      } catch (error) {
        this.log("Whisper transcription failed, using fallback", "warn");
        transcript = "[Audio transcription unavailable]";
      }

      // Get conversation history
      const conversationHistory = (session.conversationHistory as any[]) || [];

      // Generate AI response
      const aiResponse = await aiServiceMonitor.executeWithMonitoring(
        'gemini',
        async () => {
          return await geminiService.generateConversationResponse({
            conversationHistory: conversationHistory.map((msg: any) => ({
              role: msg.role,
              content: msg.content
            })),
            userInput: transcript,
            proficiencyLevel: params.proficiencyLevel,
            language: params.targetLanguage
          });
        }
      );

      // Extract corrections from response
      const corrections = this.extractCorrections(aiResponse);

      // Generate feedback
      const feedback = this.generateFeedback(transcript, params.proficiencyLevel);

      // Update conversation history
      const updatedHistory = [
        ...conversationHistory,
        {
          role: 'user',
          content: transcript,
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }
      ];

      // Update session
      await db.update(voiceSessions)
        .set({
          conversationHistory: updatedHistory,
          totalTurns: session.totalTurns + 1
        })
        .where(eq(voiceSessions.id, params.sessionId));

      this.log("Voice input processed successfully", "info");

      return {
        transcript,
        response: aiResponse,
        corrections,
        feedback
      };
    } catch (error) {
      throw this.handleError(error, "VoiceTeachingService.processVoiceInput");
    }
  }

  /**
   * End voice session and calculate XP
   * Requirements: 7.7, 10.3, 19.4, 19.6
   * Uses transaction to ensure session end, XP gain, and profile update are atomic
   */
  async endVoiceSession(params: {
    sessionId: string;
    profileId: string;
  }): Promise<{
    transcript: Array<{ role: string; content: string; timestamp: string }>;
    xpAwarded: number;
    totalTurns: number;
    duration: number;
  }> {
    try {
      this.log(`Ending voice session ${params.sessionId}`, "info");

      // Get session
      const session = await db.query.voiceSessions.findFirst({
        where: eq(voiceSessions.id, params.sessionId)
      });

      if (!session) {
        throw new Error("Voice session not found");
      }

      // Get profile to get userId
      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, params.profileId)
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Calculate duration in minutes
      const duration = session.startedAt 
        ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)
        : 0;

      // Calculate XP based on session length and turns
      const baseXP = 50;
      const turnBonus = session.totalTurns * 10;
      const xpAwarded = baseXP + turnBonus;

      // Use transaction with retry to ensure atomic operation
      await withTransactionAndRetry(async (tx) => {
        // Update session
        await tx.update(voiceSessions)
          .set({
            endedAt: new Date(),
            xpAwarded
          })
          .where(eq(voiceSessions.id, params.sessionId));

        // Record XP gain
        await tx.insert(xpGains).values({
          userId: profile.userId,
          profileId: params.profileId,
          amount: xpAwarded,
          source: 'voice',
          sourceId: params.sessionId,
          timestamp: new Date()
        });

        // Update profile XP
        await tx.update(learningProfiles)
          .set({
            currentXP: profile.currentXP + xpAwarded,
            lastActivityDate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(learningProfiles.id, params.profileId));
      });

      this.log(`Voice session ended, awarded ${xpAwarded} XP`, "info");

      return {
        transcript: (session.conversationHistory as any[]) || [],
        xpAwarded,
        totalTurns: session.totalTurns,
        duration
      };
    } catch (error) {
      throw this.handleError(error, "VoiceTeachingService.endVoiceSession");
    }
  }

  /**
   * Get session history for a profile
   */
  async getSessionHistory(profileId: string, limit: number = 10): Promise<VoiceSession[]> {
    try {
      const sessions = await db.query.voiceSessions.findMany({
        where: eq(voiceSessions.profileId, profileId),
        limit,
        orderBy: (voiceSessions, { desc }) => [desc(voiceSessions.startedAt)]
      });

      return sessions;
    } catch (error) {
      throw this.handleError(error, "VoiceTeachingService.getSessionHistory");
    }
  }

  /**
   * Get a specific session by ID
   */
  async getSessionById(sessionId: string): Promise<VoiceSession | undefined> {
    try {
      const session = await db.query.voiceSessions.findFirst({
        where: eq(voiceSessions.id, sessionId)
      });

      return session;
    } catch (error) {
      throw this.handleError(error, "VoiceTeachingService.getSessionById");
    }
  }

  /**
   * Extract corrections from AI response
   */
  private extractCorrections(response: string): string[] {
    // Look for correction patterns in the response
    const corrections: string[] = [];
    const correctionPatterns = [
      /\(correct: ([^)]+)\)/gi,
      /should be "([^"]+)"/gi,
      /better to say "([^"]+)"/gi
    ];

    for (const pattern of correctionPatterns) {
      let match: RegExpExecArray | null = pattern.exec(response);
      while (match) {
        if (match[1]) {
          corrections.push(match[1]);
        }
        match = pattern.exec(response);
      }
    }

    return corrections;
  }

  /**
   * Generate feedback for learner's response
   */
  private generateFeedback(transcript: string, proficiencyLevel: string): string {
    if (transcript.includes("[Audio transcription unavailable]")) {
      return "Please try speaking more clearly.";
    }

    const wordCount = transcript.split(' ').length;
    
    if (wordCount < 3) {
      return "Try to speak in complete sentences.";
    }

    if (proficiencyLevel === 'Beginner') {
      return "Good effort! Keep practicing your pronunciation.";
    } else if (proficiencyLevel === 'Intermediate') {
      return "Well done! Your fluency is improving.";
    } else {
      return "Excellent! Your language skills are advanced.";
    }
  }

  /**
   * Get language code for Whisper
   */
  private getLanguageCode(language: string): string {
    const languageMap: { [key: string]: string } = {
      'Spanish': 'es',
      'Mandarin Chinese': 'zh',
      'English': 'en',
      'Hindi': 'hi',
      'Arabic': 'ar'
    };
    return languageMap[language] || 'en';
  }
}

export const voiceTeachingService = new VoiceTeachingService();
