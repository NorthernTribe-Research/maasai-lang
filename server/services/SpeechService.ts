import { BaseService } from './BaseService';
import { WhisperService } from './WhisperService';
import { db } from '../db';
import { pronunciationAnalyses, pronunciationTrends } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

const whisperService = new WhisperService();

/**
 * Speech Service for pronunciation analysis and coaching
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */
export class SpeechService extends BaseService {
  constructor() {
    super();
    this.log("SpeechService initialized", "info");
  }

  /**
   * Analyze pronunciation and provide detailed feedback
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async analyzePronunciation(params: {
    audioData: Buffer;
    targetText: string;
    language: string;
    proficiencyLevel: string;
  }): Promise<{
    score: number;
    feedback: string;
    problematicPhonemes: Array<{
      phoneme: string;
      accuracy: number;
      position: number;
      feedback: string;
    }>;
    audioExamples: string[];
  }> {
    try {
      this.log("Analyzing pronunciation", "info");

      // Use Whisper to analyze pronunciation
      const analysis = await whisperService.analyzePronunciation(
        params.audioData,
        params.targetText,
        this.getLanguageCode(params.language)
      );

      // Calculate pronunciation score (0-100)
      const score = analysis.pronunciation.accuracy;

      // Generate detailed feedback
      const feedback = this.generatePronunciationFeedback(
        score,
        analysis.pronunciation.issues,
        params.proficiencyLevel
      );

      // Extract problematic phonemes
      const problematicPhonemes = analysis.pronunciation.issues.map(issue => ({
        phoneme: issue.word,
        accuracy: 100 - (issue.expected === issue.actual ? 0 : 50),
        position: 0,
        feedback: issue.suggestion
      }));

      // Generate audio examples (URLs would point to pronunciation guides)
      const audioExamples = this.generateAudioExampleUrls(
        params.targetText,
        params.language
      );

      this.log(`Pronunciation analyzed, score: ${score}`, "info");

      return {
        score,
        feedback,
        problematicPhonemes,
        audioExamples
      };
    } catch (error) {
      throw this.handleError(error, "SpeechService.analyzePronunciation");
    }
  }

  /**
   * Generate pronunciation exercises for problematic sounds
   * Requirements: 8.7
   */
  async generatePronunciationExercises(params: {
    problematicPhonemes: string[];
    language: string;
  }): Promise<Array<{
    targetPhoneme: string;
    practiceWords: string[];
    exampleAudioUrl: string;
    instructions: string;
  }>> {
    try {
      this.log("Generating pronunciation exercises", "info");

      const exercises = [];

      for (const phoneme of params.problematicPhonemes) {
        exercises.push({
          targetPhoneme: phoneme,
          practiceWords: this.getPracticeWords(phoneme, params.language),
          exampleAudioUrl: `/api/audio/pronunciation/${params.language}/${phoneme}`,
          instructions: `Practice the "${phoneme}" sound. Listen to the example and repeat slowly.`
        });
      }

      return exercises;
    } catch (error) {
      throw this.handleError(error, "SpeechService.generatePronunciationExercises");
    }
  }

  /**
   * Track pronunciation progress over time
   * Requirements: 8.6
   */
  async trackPronunciationProgress(profileId: string): Promise<Array<{
    date: Date;
    averageScore: number;
    phonemeScores: { [key: string]: number };
    improvementRate: number;
  }>> {
    try {
      this.log(`Tracking pronunciation progress for profile ${profileId}`, "info");

      // Get pronunciation trends
      const trends = await db.query.pronunciationTrends.findMany({
        where: eq(pronunciationTrends.profileId, profileId),
        orderBy: (pronunciationTrends, { desc }) => [desc(pronunciationTrends.date)],
        limit: 30
      });

      return trends.map(trend => ({
        date: trend.date,
        averageScore: trend.averageScore,
        phonemeScores: (trend.phonemeScores as any) || {},
        improvementRate: trend.improvementRate
      }));
    } catch (error) {
      throw this.handleError(error, "SpeechService.trackPronunciationProgress");
    }
  }

  /**
   * Save pronunciation analysis to database
   */
  async savePronunciationAnalysis(params: {
    profileId: string;
    score: number;
    transcript: string;
    targetText: string;
    problematicPhonemes: any[];
    feedback: string;
  }): Promise<void> {
    try {
      // Save analysis
      await db.insert(pronunciationAnalyses).values({
        profileId: params.profileId,
        score: params.score,
        transcript: params.transcript,
        targetText: params.targetText,
        problematicPhonemes: params.problematicPhonemes,
        overallFeedback: params.feedback,
        timestamp: new Date()
      });

      // Update pronunciation trend
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate phoneme scores
      const phonemeScores: { [key: string]: number } = {};
      params.problematicPhonemes.forEach((p: any) => {
        phonemeScores[p.phoneme] = p.accuracy;
      });

      await db.insert(pronunciationTrends).values({
        profileId: params.profileId,
        date: today,
        averageScore: params.score,
        phonemeScores,
        improvementRate: 0 // Would be calculated from historical data
      }).onConflictDoUpdate({
        target: [pronunciationTrends.profileId, pronunciationTrends.date],
        set: {
          averageScore: sql`(${pronunciationTrends.averageScore} + ${params.score}) / 2`,
          phonemeScores
        }
      });

      this.log("Pronunciation analysis saved", "info");
    } catch (error) {
      throw this.handleError(error, "SpeechService.savePronunciationAnalysis");
    }
  }

  /**
   * Generate pronunciation feedback based on score
   */
  private generatePronunciationFeedback(
    score: number,
    issues: any[],
    proficiencyLevel: string
  ): string {
    if (score >= 90) {
      return "Excellent pronunciation! Your speech is very clear and natural.";
    } else if (score >= 80) {
      return "Good pronunciation! A few minor improvements would make it even better.";
    } else if (score >= 70) {
      return "Your pronunciation is understandable. Focus on the specific sounds that need work.";
    } else if (score >= 60) {
      return "Keep practicing! Pay attention to the problematic sounds and practice them slowly.";
    } else {
      return "Don't worry, pronunciation takes time. Practice the basics and speak slowly.";
    }
  }

  /**
   * Get practice words for a phoneme
   */
  private getPracticeWords(phoneme: string, language: string): string[] {
    // This would be a comprehensive database of practice words
    // For now, return placeholder words
    return [
      `word1_with_${phoneme}`,
      `word2_with_${phoneme}`,
      `word3_with_${phoneme}`
    ];
  }

  /**
   * Generate audio example URLs
   */
  private generateAudioExampleUrls(text: string, language: string): string[] {
    // These would be actual audio file URLs
    return [
      `/api/audio/examples/${language}/slow/${encodeURIComponent(text)}`,
      `/api/audio/examples/${language}/normal/${encodeURIComponent(text)}`
    ];
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

export const speechService = new SpeechService();
