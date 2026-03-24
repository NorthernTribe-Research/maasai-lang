import { BaseService } from './BaseService';
import { db } from '../db';
import { GeminiService } from './GeminiService';
import { CurriculumService } from './CurriculumService';
import { AdaptiveLearningService } from './AdaptiveLearningService';
import { SpeechService } from './SpeechService';
import { eq } from 'drizzle-orm';
import { learningProfiles } from '../../shared/schema';

interface LearningContext {
  profileId?: string;
  hasProfile: boolean;
  language: {
    id: number;
    name: string;
    code: string;
    flag?: string;
    description?: string | null;
  };
  nativeLanguage: string;
  proficiencyLevel: string;
  performance: {
    accuracy: number;
  };
  preferences: {
    interests: string[];
  };
  knowledgeState: {
    strugglingConcepts: string[];
  };
  strengths: string[];
  weaknesses: string[];
}

/**
 * Unified AI-enhanced services orchestrator
 */
export class AIEnhancedServices extends BaseService {
  private geminiService: GeminiService;
  private curriculumService: CurriculumService;
  private adaptiveLearningService: AdaptiveLearningService;
  private speechService: SpeechService;

  constructor() {
    super();
    this.geminiService = new GeminiService();
    this.curriculumService = new CurriculumService();
    this.adaptiveLearningService = new AdaptiveLearningService();
    this.speechService = new SpeechService();
    this.log("AI Enhanced Services initialized", "info");
  }

  // Getters for individual services
  get curriculum() { return this.curriculumService; }
  get adaptive() { return this.adaptiveLearningService; }
  get speech() { return this.speechService; }
  get gemini() { return this.geminiService; }

  /**
   * Generate complete lesson with all AI features
   */
  async generateComprehensiveLesson(
    languageId: number,
    userId: string,
    topic: string,
    level: string
  ) {
    try {
      const context = await this.getLearningContext(userId, languageId);
      const language = context.language;
      const proficiencyLevel = level || context.proficiencyLevel;

      const curriculum = await this.geminiService.generateCurriculum({
        targetLanguage: language.name,
        nativeLanguage: context.nativeLanguage,
        proficiencyLevel
      });

      const lessonPlan = this.buildLessonPlan(curriculum, topic, proficiencyLevel);
      const vocabulary = await this.geminiService.generateVocabularyList(
        language.name,
        topic,
        proficiencyLevel,
        10
      );

      const grammarTopic = lessonPlan.grammar?.[0]?.topic
        || lessonPlan.grammar?.[0]?.concept
        || 'basic grammar';
      const grammarExplanation = await this.geminiService.generateGrammarExplanation(
        language.name,
        grammarTopic,
        proficiencyLevel
      );

      const culturalContent = await this.geminiService.generateCulturalContent(
        language.name,
        topic,
        proficiencyLevel
      );
      
      return {
        lessonPlan,
        vocabulary,
        grammarExplanation,
        culturalContent,
        adaptiveRecommendations: this.buildAdaptiveRecommendations(context, 'lesson')
      };
    } catch (error) {
      this.handleError(error, "AIEnhancedServices.generateComprehensiveLesson");
      throw error;
    }
  }

  /**
   * Analyze user session and provide comprehensive feedback
   */
  async analyzeSessionAndAdapt(
    userId: string,
    languageId: number,
    sessionData: any
  ) {
    try {
      const context = await this.getLearningContext(userId, languageId);
      const responses = Array.isArray(sessionData?.responses) ? sessionData.responses : [];
      const accuracy = this.calculateSessionAccuracy(responses);
      const completionTime = Number(sessionData?.duration ?? responses.length * 2);
      const errorsCount = this.calculateSessionErrors(responses);
      const errorPatterns = this.extractErrorPatterns(responses);

      const performanceAnalysis = context.hasProfile
        ? await this.adaptiveLearningService.analyzePerformance({
            profileId: context.profileId!,
            activityType: 'tutor',
            metrics: {
              accuracy,
              completionTime,
              errorsCount,
              errorPatterns
            }
          })
        : this.getFallbackPerformanceAnalysis(accuracy, errorsCount, errorPatterns);

      const difficultyAdjustment = performanceAnalysis.difficultyAdjustment;
      const insights = this.buildLearningInsights(context, accuracy, performanceAnalysis.performanceLevel);
      const spacedRepetition = this.buildSpacedRepetitionSchedule(
        context.knowledgeState.strugglingConcepts,
        difficultyAdjustment
      );
      
      return {
        performanceAnalysis,
        difficultyAdjustment,
        insights,
        spacedRepetition,
        nextRecommendations: performanceAnalysis.recommendations
      };
    } catch (error) {
      this.handleError(error, "AIEnhancedServices.analyzeSessionAndAdapt");
      throw error;
    }
  }

  /**
   * Generate dynamic exercises based on user weaknesses
   */
  async generatePersonalizedExercises(
    userId: string,
    languageId: number,
    exerciseType: string,
    count: number = 5
  ) {
    try {
      const context = await this.getLearningContext(userId, languageId);
      const language = context.language;
      
      const exercises: any[] = [];
      const focusAreas = context.knowledgeState.strugglingConcepts.length > 0
        ? context.knowledgeState.strugglingConcepts
        : context.weaknesses;
      
      for (let i = 0; i < count; i++) {
        const exercise = await this.generatePersonalizedExercise(
          language.name,
          focusAreas,
          Math.ceil(context.performance.accuracy / 20), // Convert to 1-5 scale
          exerciseType
        );
        exercises.push(exercise);
      }
      
      return exercises;
    } catch (error) {
      this.handleError(error, "AIEnhancedServices.generatePersonalizedExercises");
      throw error;
    }
  }

  /**
   * Provide pronunciation coaching
   */
  async providePronunciationCoaching(
    userId: string,
    languageCode: string,
    audioData: string,
    expectedText: string
  ) {
    try {
      // Analyze pronunciation
      const audioBuffer = Buffer.from(audioData, 'base64');
      const pronunciationFeedback = await this.speechService.analyzePronunciation({
        audioData: audioBuffer,
        targetText: expectedText,
        language: languageCode,
        proficiencyLevel: 'intermediate'
      });
      
      const voiceProfile = {
        userId,
        languageCode,
        targetLanguage: languageCode,
        score: pronunciationFeedback.score,
        strengths: pronunciationFeedback.score >= 80 ? ['clear rhythm'] : ['willingness to practice'],
        challenges: pronunciationFeedback.problematicPhonemes.map((phoneme) => phoneme.phoneme),
        feedback: pronunciationFeedback.feedback
      };

      const personalizedTips = pronunciationFeedback.problematicPhonemes.length > 0
        ? pronunciationFeedback.problematicPhonemes.map((phoneme) => phoneme.feedback)
        : ['Keep listening carefully and repeat each phrase slowly.'];

      // Generate pronunciation exercises
      const exercises = await this.speechService.generatePronunciationExercises({
        problematicPhonemes: voiceProfile.challenges,
        language: languageCode
      });
      
      return {
        pronunciationFeedback,
        voiceProfile,
        personalizedTips,
        exercises
      };
    } catch (error) {
      this.handleError(error, "AIEnhancedServices.providePronunciationCoaching");
      throw error;
    }
  }

  /**
   * Generate learning path for user
   */
  async generatePersonalizedLearningPath(
    userId: string,
    languageId: number,
    goals: string[],
    timeframe: number // weeks
  ) {
    try {
      const context = await this.getLearningContext(userId, languageId);
      const language = context.language;
      const difficulty = this.determineLevel(context.performance.accuracy);

      // Generate comprehensive curriculum
      const curriculum = await this.geminiService.generateCurriculum({
        targetLanguage: language.name,
        nativeLanguage: context.nativeLanguage,
        proficiencyLevel: difficulty
      });

      // Generate learning path using Gemini
      const learningPath = await this.geminiService.generateLearningPath(
        userId,
        languageId
      );
      
      return {
        curriculum,
        learningPath,
        estimatedCompletion: timeframe,
        difficulty
      };
    } catch (error) {
      this.handleError(error, "AIEnhancedServices.generatePersonalizedLearningPath");
      throw error;
    }
  }

  /**
   * Get AI teacher response
   */
  async getAITeacherResponse(
    languageId: number,
    userId: string,
    message: string,
    conversationHistory: Array<{role: string, content: string}>
  ) {
    try {
      const learningContext = await this.getLearningContext(userId, languageId);
      const language = learningContext.language;
      
      // Use Gemini's mascot dialogue for engaging responses
      return await this.geminiService.getLanguageMascotDialogue(
        language.code,
        `Student said: "${message}". Provide helpful teaching response.`
      );
    } catch (error) {
      this.handleError(error, "AIEnhancedServices.getAITeacherResponse");
      return "I'm here to help you learn! Let's continue practicing.";
    }
  }

  /**
   * Helper methods
   */
  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  private estimateAccuracy(proficiencyLevel?: string | null, currentXP?: number | null): number {
    const level = (proficiencyLevel || '').toLowerCase();
    if (level.includes('fluent') || level.includes('advanced')) return 85;
    if (level.includes('intermediate')) return 65;
    if (level.includes('beginner')) return 35;

    const xp = typeof currentXP === 'number' ? currentXP : 0;
    if (xp >= 1500) return 85;
    if (xp >= 500) return 65;
    return 40;
  }

  private async getLearningContext(userId: string, languageId: number): Promise<LearningContext> {
    const language = await this.getLanguageById(languageId);
    const profiles = await db.query.learningProfiles.findMany({
      where: eq(learningProfiles.userId, userId)
    });
    const profile = profiles.find((entry) => {
      const targetLanguage = String(entry.targetLanguage || '').toLowerCase();
      return targetLanguage === String(language.name).toLowerCase()
        || targetLanguage === String(language.code).toLowerCase();
    });

    const strengths = this.normalizeStringArray(profile?.strengths);
    const weaknesses = this.normalizeStringArray(profile?.weaknesses);
    const accuracy = this.estimateAccuracy(profile?.proficiencyLevel, profile?.currentXP);

    return {
      profileId: profile?.id,
      hasProfile: !!profile,
      language,
      nativeLanguage: profile?.nativeLanguage || 'English',
      proficiencyLevel: profile?.proficiencyLevel || this.determineLevel(accuracy),
      performance: { accuracy },
      preferences: {
        interests: strengths.length > 0 ? strengths : []
      },
      knowledgeState: {
        strugglingConcepts: weaknesses.length > 0 ? weaknesses : ['core vocabulary', 'basic grammar']
      },
      strengths,
      weaknesses
    };
  }

  private buildLessonPlan(curriculum: any, topic: string, level: string) {
    const lesson = curriculum?.curriculum?.lessons?.[0]
      || curriculum?.lesson?.[0]
      || curriculum?.lesson
      || curriculum?.lessons?.[0]
      || {};

    return {
      title: lesson.title || `${topic} lesson`,
      description: lesson.description || `A ${level} lesson focused on ${topic}.`,
      vocabulary: lesson.vocabulary || [],
      grammar: lesson.grammar || [],
      culturalContent: lesson.culturalContent || [],
      estimatedDuration: lesson.estimatedDuration || 30
    };
  }

  private buildAdaptiveRecommendations(context: LearningContext, focus: string): string[] {
    const recommendations = [
      `Continue practicing ${focus} with short, focused sessions`,
      'Review vocabulary in context',
      'Use spaced repetition for repeated exposure'
    ];

    if (context.weaknesses.includes('grammar')) {
      recommendations.push('Spend a few minutes on grammar drills');
    }

    if (context.weaknesses.includes('pronunciation')) {
      recommendations.push('Practice aloud and compare against native audio');
    }

    return recommendations;
  }

  private getFallbackPerformanceAnalysis(
    accuracy: number,
    errorsCount: number,
    errorPatterns: string[]
  ) {
    const difficultyAdjustment = accuracy >= 85 && errorsCount < 2
      ? 1
      : accuracy < 60 || errorsCount > 8
        ? -1
        : 0;

    return {
      performanceLevel: accuracy >= 90
        ? 'excellent'
        : accuracy >= 75
          ? 'good'
          : accuracy >= 60
            ? 'average'
            : 'needs_improvement',
      recommendations: [
        'Practice vocabulary in context',
        'Focus on pronunciation clarity',
        ...(errorPatterns.length > 0 ? [`Pay special attention to ${errorPatterns.join(', ')}`] : [])
      ],
      difficultyAdjustment
    };
  }

  private buildLearningInsights(context: LearningContext, accuracy: number, performanceLevel: string) {
    return {
      strengths: context.strengths,
      weaknesses: context.weaknesses,
      accuracy,
      performanceLevel,
      recommendedFocus: this.buildAdaptiveRecommendations(context, 'practice')
    };
  }

  private buildSpacedRepetitionSchedule(concepts: string[], difficultyAdjustment: number) {
    const baseDelay = difficultyAdjustment < 0 ? 1 : difficultyAdjustment > 0 ? 3 : 2;

    return concepts.map((concept, index) => ({
      concept,
      reviewInDays: baseDelay + index,
      priority: difficultyAdjustment < 0 ? 'high' : 'normal'
    }));
  }

  private calculateSessionAccuracy(responses: any[]): number {
    if (responses.length === 0) {
      return 0;
    }

    const correct = responses.filter((response) => {
      const userAnswer = String(response?.userAnswer ?? '').toLowerCase().trim();
      const correctAnswer = String(response?.correctAnswer ?? '').toLowerCase().trim();
      return userAnswer.length > 0 && userAnswer === correctAnswer;
    }).length;

    return Math.round((correct / responses.length) * 100);
  }

  private calculateSessionErrors(responses: any[]): number {
    return responses.filter((response) => {
      const userAnswer = String(response?.userAnswer ?? '').toLowerCase().trim();
      const correctAnswer = String(response?.correctAnswer ?? '').toLowerCase().trim();
      return userAnswer.length > 0 && userAnswer !== correctAnswer;
    }).length;
  }

  private extractErrorPatterns(responses: any[]): string[] {
    const patterns = new Set<string>();

    for (const response of responses) {
      const type = String(response?.type ?? '').trim();
      if (type) {
        patterns.add(type);
      }
    }

    return Array.from(patterns);
  }

  private async generatePersonalizedExercise(
    language: string,
    focusAreas: string[],
    difficulty: number,
    exerciseType: string
  ) {
    const prompt = `Generate a personalized ${exerciseType} exercise for ${language}.

Focus areas: ${focusAreas.join(', ') || 'general review'}
Difficulty (1-5): ${difficulty}

Return JSON with type, prompt, answer, hints, and explanation.`;

    try {
      const result = await this.geminiService.generateContent(prompt);
      try {
        return JSON.parse(result);
      } catch {
        return {
          type: exerciseType,
          prompt: `Practice ${focusAreas[0] || 'core language skills'} in ${language}.`,
          answer: '',
          hints: [],
          explanation: `A ${difficulty}-level practice activity focused on ${focusAreas[0] || 'general fluency'}.`
        };
      }
    } catch {
      return {
        type: exerciseType,
        prompt: `Practice ${focusAreas[0] || 'core language skills'} in ${language}.`,
        answer: '',
        hints: [],
        explanation: `A ${difficulty}-level practice activity focused on ${focusAreas[0] || 'general fluency'}.`
      };
    }
  }

  private async getLanguageById(languageId: number) {
    const { storage } = await import('../storage');
    
    // Try to get language from database first
    const languages = await storage.getAllLanguages();
    const language = languages.find(l => l.id === languageId);
    
    if (language) {
      return language;
    }
    
    // Fallback language mapping
    const languageMap: { [key: number]: any } = {
      1: { id: 1, name: 'Spanish', code: 'es', flag: '🇪🇸', description: 'Spanish language' },
      2: { id: 2, name: 'French', code: 'fr', flag: '🇫🇷', description: 'French language' },
      3: { id: 3, name: 'German', code: 'de', flag: '🇩🇪', description: 'German language' },
      4: { id: 4, name: 'Japanese', code: 'ja', flag: '🇯🇵', description: 'Japanese language' },
      5: { id: 5, name: 'Chinese', code: 'zh', flag: '🇨🇳', description: 'Chinese language' }
    };
    
    return languageMap[languageId] || languageMap[1];
  }

  private determineLevel(accuracy: number): string {
    if (accuracy < 40) return 'beginner';
    if (accuracy < 70) return 'intermediate';
    return 'advanced';
  }
}

// Export singleton instance
export const aiEnhancedServices = new AIEnhancedServices();
