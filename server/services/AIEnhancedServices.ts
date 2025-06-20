import { BaseService } from './BaseService';
import { GeminiService } from './GeminiService';
import { CurriculumService } from './CurriculumService';
import { AdaptiveLearningService } from './AdaptiveLearningService';
import { SpeechService } from './SpeechService';

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
    this.curriculumService = new CurriculumService(this.geminiService);
    this.adaptiveLearningService = new AdaptiveLearningService(this.geminiService);
    this.speechService = new SpeechService(this.geminiService);
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
    userId: number,
    topic: string,
    level: string
  ) {
    try {
      const language = await this.getLanguageById(languageId);
      const userProfile = await this.adaptiveLearningService.getLearningProfile(userId, languageId);
      
      // Generate curriculum topic
      const curriculumTopics = await this.curriculumService.generateCurriculum(
        language,
        level,
        [topic],
        1
      );
      
      const lessonTopic = curriculumTopics[0];
      
      // Generate lesson plan
      const lessonPlan = await this.curriculumService.generateLessonPlan(
        language,
        lessonTopic,
        level,
        {
          learningStyle: 'mixed',
          interests: userProfile.preferences.interests,
          timeAvailable: 30
        }
      );
      
      // Generate vocabulary
      const vocabulary = await this.geminiService.generateVocabularyList(
        language.name,
        topic,
        level,
        10
      );
      
      // Generate grammar explanation
      const grammarExplanation = await this.geminiService.generateGrammarExplanation(
        language.name,
        lessonPlan.grammar[0]?.concept || 'basic grammar',
        level
      );
      
      // Generate cultural content
      const culturalContent = await this.geminiService.generateCulturalContent(
        language.name,
        topic,
        level
      );
      
      return {
        lessonPlan,
        vocabulary,
        grammarExplanation,
        culturalContent,
        adaptiveRecommendations: await this.adaptiveLearningService.getRecommendations(
          userId,
          languageId,
          'lesson'
        )
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
    userId: number,
    languageId: number,
    sessionData: any
  ) {
    try {
      // Update learning profile
      await this.adaptiveLearningService.updateLearningProfile(
        userId,
        languageId,
        sessionData
      );
      
      // Get performance analysis
      const performanceAnalysis = await this.geminiService.analyzePerformance(
        sessionData.responses,
        (await this.getLanguageById(languageId)).name
      );
      
      // Get difficulty adjustment
      const difficultyAdjustment = await this.adaptiveLearningService.analyzeDifficultyAdjustment(
        userId,
        languageId
      );
      
      // Get learning insights
      const insights = await this.adaptiveLearningService.getLearningInsights(
        userId,
        languageId
      );
      
      // Generate spaced repetition schedule
      const spacedRepetition = await this.adaptiveLearningService.generateSpacedRepetition(
        userId,
        languageId
      );
      
      return {
        performanceAnalysis,
        difficultyAdjustment,
        insights,
        spacedRepetition,
        nextRecommendations: await this.adaptiveLearningService.getRecommendations(
          userId,
          languageId,
          'practice'
        )
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
    userId: number,
    languageId: number,
    exerciseType: string,
    count: number = 5
  ) {
    try {
      const profile = await this.adaptiveLearningService.getLearningProfile(userId, languageId);
      const language = await this.getLanguageById(languageId);
      
      const exercises = [];
      
      for (let i = 0; i < count; i++) {
        const exercise = await this.geminiService.generatePersonalizedExercise(
          language.name,
          profile.knowledgeState.strugglingConcepts,
          profile.knowledgeState.strugglingConcepts,
          Math.ceil(profile.performance.accuracy / 20), // Convert to 1-5 scale
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
    userId: number,
    languageCode: string,
    audioData: string,
    expectedText: string
  ) {
    try {
      // Analyze pronunciation
      const pronunciationFeedback = await this.speechService.analyzePronunciation(
        audioData,
        expectedText,
        languageCode,
        userId
      );
      
      // Get voice profile
      const voiceProfile = await this.speechService.getVoiceProfile(userId, languageCode);
      
      // Generate personalized tips
      const personalizedTips = await this.speechService.generatePersonalizedTips(
        userId,
        languageCode
      );
      
      // Generate pronunciation exercises
      const exercises = await this.speechService.generatePronunciationExercises(
        languageCode,
        'intermediate',
        voiceProfile.challenges
      );
      
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
    userId: number,
    languageId: number,
    goals: string[],
    timeframe: number // weeks
  ) {
    try {
      const language = await this.getLanguageById(languageId);
      const profile = await this.adaptiveLearningService.getLearningProfile(userId, languageId);
      
      // Generate comprehensive curriculum
      const curriculum = await this.curriculumService.generateCurriculum(
        language,
        this.determineLevel(profile.performance.accuracy),
        goals,
        timeframe * 7 // Convert to days
      );
      
      // Generate learning path using Gemini
      const learningPath = await this.geminiService.generateLearningPath(
        language.code,
        this.determineLevel(profile.performance.accuracy),
        goals.join(', ')
      );
      
      return {
        curriculum,
        learningPath,
        estimatedCompletion: timeframe,
        difficulty: this.determineLevel(profile.performance.accuracy)
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
    userId: number,
    message: string,
    conversationHistory: Array<{role: string, content: string}>
  ) {
    try {
      const language = await this.getLanguageById(languageId);
      const profile = await this.adaptiveLearningService.getLearningProfile(userId, languageId);
      
      const context = {
        language: language.name,
        level: this.determineLevel(profile.performance.accuracy),
        topic: 'general conversation',
        studentResponse: message,
        conversationHistory,
        teacherPersonality: 'encouraging and patient'
      };
      
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