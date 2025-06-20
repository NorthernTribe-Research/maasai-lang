import { BaseService } from './BaseService';
import { GeminiService } from './GeminiService';
import { WhisperService } from './WhisperService';
import OpenAI from 'openai';

export interface LearningAnalytics {
  strengths: string[];
  weaknesses: string[];
  recommendedFocus: string[];
  progressMetrics: {
    vocabulary: number;
    grammar: number;
    pronunciation: number;
    fluency: number;
  };
  nextMilestones: string[];
}

export interface PersonalizedCurriculum {
  learnerProfile: {
    level: string;
    interests: string[];
    learningStyle: string;
    goals: string[];
  };
  adaptedLessons: Array<{
    title: string;
    difficulty: number;
    estimatedTime: number;
    prerequisites: string[];
    outcomes: string[];
    content: {
      vocabulary: Array<{ word: string; context: string; difficulty: number }>;
      grammar: Array<{ rule: string; examples: string[]; exercises: string[] }>;
      cultural: Array<{ topic: string; content: string; discussion: string[] }>;
    };
  }>;
  progressionPath: string[];
}

export interface RealTimeAssessment {
  accuracy: number;
  fluency: number;
  comprehension: number;
  areas: {
    pronunciation: number;
    vocabulary: number;
    grammar: number;
    cultural: number;
  };
  feedback: string;
  recommendations: string[];
}

/**
 * Advanced AI service for sophisticated language learning features
 */
export class AdvancedAIService extends BaseService {
  private geminiService: GeminiService;
  private whisperService: WhisperService;
  private openai: OpenAI;

  constructor() {
    super();
    this.geminiService = new GeminiService();
    this.whisperService = new WhisperService();
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'demo-api-key') {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate comprehensive learning analytics
   */
  async generateLearningAnalytics(
    userId: number,
    languageId: number,
    recentSessions: Array<{
      type: string;
      accuracy: number;
      duration: number;
      topics: string[];
      mistakes: string[];
    }>
  ): Promise<LearningAnalytics> {
    try {
      if (!this.openai) {
        return this.getDefaultAnalytics();
      }

      const prompt = `Analyze learning performance and provide detailed analytics.

Recent Sessions: ${JSON.stringify(recentSessions)}

Provide comprehensive analysis with:
1. Identified strengths across all language skills
2. Areas needing improvement with specific details
3. Recommended focus areas for next sessions
4. Progress metrics (0-100 scale) for vocabulary, grammar, pronunciation, fluency
5. Next learning milestones to achieve

Return JSON:
{
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendedFocus": ["focus1", "focus2"],
  "progressMetrics": {
    "vocabulary": 75,
    "grammar": 68,
    "pronunciation": 82,
    "fluency": 71
  },
  "nextMilestones": ["milestone1", "milestone2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      this.handleError(error, "generating learning analytics");
      return this.getDefaultAnalytics();
    }
  }

  /**
   * Create personalized curriculum based on learner profile
   */
  async generatePersonalizedCurriculum(
    learnerData: {
      level: string;
      interests: string[];
      goals: string[];
      learningStyle: string;
      timeAvailable: number;
      previousExperience: string[];
    },
    targetLanguage: string
  ): Promise<PersonalizedCurriculum> {
    try {
      const prompt = `Create a personalized curriculum for ${targetLanguage} language learning.

Learner Profile:
- Level: ${learnerData.level}
- Interests: ${learnerData.interests.join(', ')}
- Goals: ${learnerData.goals.join(', ')}
- Learning Style: ${learnerData.learningStyle}
- Time Available: ${learnerData.timeAvailable} hours/week
- Previous Experience: ${learnerData.previousExperience.join(', ')}

Generate a comprehensive curriculum with:
1. Detailed learner profile analysis
2. Adapted lessons with progressive difficulty
3. Contextual vocabulary based on interests
4. Grammar concepts with practical applications
5. Cultural content aligned with goals
6. Clear progression pathway

Return JSON with learnerProfile, adaptedLessons, and progressionPath.`;

      if (this.geminiService.isServiceAvailable()) {
        const result = await this.geminiService.generateContent(prompt);
        try {
          return JSON.parse(result);
        } catch {
          return this.getDefaultCurriculum(learnerData, targetLanguage);
        }
      }

      return this.getDefaultCurriculum(learnerData, targetLanguage);
    } catch (error) {
      this.handleError(error, "generating personalized curriculum");
      return this.getDefaultCurriculum(learnerData, targetLanguage);
    }
  }

  /**
   * Real-time assessment during practice sessions
   */
  async performRealTimeAssessment(
    sessionData: {
      responses: Array<{
        question: string;
        userAnswer: string;
        correctAnswer: string;
        type: string;
        timeSpent: number;
      }>;
      audioData?: string;
      conversationTurns?: Array<{
        prompt: string;
        response: string;
        naturalness: number;
      }>;
    },
    targetLanguage: string,
    userLevel: string
  ): Promise<RealTimeAssessment> {
    try {
      let pronunciationScore = 0;
      let audioAnalysis = null;

      // Analyze audio if provided
      if (sessionData.audioData && this.whisperService.isServiceAvailable()) {
        try {
          const audioBuffer = Buffer.from(sessionData.audioData, 'base64');
          audioAnalysis = await this.whisperService.analyzePronunciation(
            audioBuffer,
            sessionData.responses[0]?.correctAnswer || "Hello",
            targetLanguage
          );
          pronunciationScore = audioAnalysis.pronunciation.accuracy;
        } catch (error) {
          this.log("Audio analysis failed", "warn");
        }
      }

      // Calculate overall metrics
      const accuracy = this.calculateAccuracy(sessionData.responses);
      const fluency = this.calculateFluency(sessionData.conversationTurns || []);
      const comprehension = this.calculateComprehension(sessionData.responses);

      const assessment: RealTimeAssessment = {
        accuracy,
        fluency,
        comprehension,
        areas: {
          pronunciation: pronunciationScore,
          vocabulary: this.calculateVocabularyScore(sessionData.responses),
          grammar: this.calculateGrammarScore(sessionData.responses),
          cultural: this.calculateCulturalScore(sessionData.responses)
        },
        feedback: this.generateContextualFeedback(accuracy, fluency, comprehension, userLevel),
        recommendations: this.generateRecommendations(sessionData, userLevel)
      };

      return assessment;
    } catch (error) {
      this.handleError(error, "performing real-time assessment");
      return this.getDefaultAssessment();
    }
  }

  /**
   * Generate adaptive difficulty content
   */
  async generateAdaptiveContent(
    currentPerformance: RealTimeAssessment,
    userPreferences: {
      topics: string[];
      difficulty: string;
      focusAreas: string[];
    },
    targetLanguage: string
  ): Promise<{
    nextExercises: Array<{
      type: string;
      content: string;
      difficulty: number;
      expectedTime: number;
      adaptationReason: string;
    }>;
    adjustedDifficulty: string;
    focusShift: string;
  }> {
    try {
      const adaptationPrompt = `Based on current performance, generate adaptive content.

Performance Metrics:
- Accuracy: ${currentPerformance.accuracy}%
- Fluency: ${currentPerformance.fluency}%
- Areas: ${JSON.stringify(currentPerformance.areas)}

User Preferences:
- Topics: ${userPreferences.topics.join(', ')}
- Current Difficulty: ${userPreferences.difficulty}
- Focus Areas: ${userPreferences.focusAreas.join(', ')}

Generate adaptive content with:
1. Exercises tailored to performance gaps
2. Adjusted difficulty level
3. Focus shift recommendations
4. Explanation of adaptations

Return JSON with nextExercises, adjustedDifficulty, and focusShift.`;

      if (this.geminiService.isServiceAvailable()) {
        const result = await this.geminiService.generateContent(adaptationPrompt);
        try {
          return JSON.parse(result);
        } catch {
          return this.getDefaultAdaptiveContent(currentPerformance, userPreferences);
        }
      }

      return this.getDefaultAdaptiveContent(currentPerformance, userPreferences);
    } catch (error) {
      this.handleError(error, "generating adaptive content");
      return this.getDefaultAdaptiveContent(currentPerformance, userPreferences);
    }
  }

  /**
   * Multi-modal learning integration
   */
  async generateMultiModalLesson(
    topic: string,
    targetLanguage: string,
    learningModalities: string[], // visual, auditory, kinesthetic, reading
    difficulty: string
  ): Promise<{
    visualElements: Array<{
      type: string;
      content: string;
      description: string;
    }>;
    auditoryElements: Array<{
      text: string;
      pronunciation: string;
      audioScript: string;
    }>;
    interactiveElements: Array<{
      activity: string;
      instructions: string;
      expectedOutcome: string;
    }>;
    readingMaterials: Array<{
      title: string;
      content: string;
      comprehensionQuestions: string[];
    }>;
  }> {
    try {
      const prompt = `Create a multi-modal lesson for "${topic}" in ${targetLanguage} at ${difficulty} level.

Learning Modalities to Include: ${learningModalities.join(', ')}

Design comprehensive content with:
1. Visual elements (charts, diagrams, infographics)
2. Auditory components (pronunciation guides, listening exercises)
3. Interactive activities (games, role-plays, hands-on exercises)
4. Reading materials (texts, articles, stories)

Ensure all modalities work together cohesively for optimal learning.

Return JSON with visualElements, auditoryElements, interactiveElements, and readingMaterials.`;

      if (this.geminiService.isServiceAvailable()) {
        const result = await this.geminiService.generateContent(prompt);
        try {
          return JSON.parse(result);
        } catch {
          return this.getDefaultMultiModalLesson(topic, targetLanguage);
        }
      }

      return this.getDefaultMultiModalLesson(topic, targetLanguage);
    } catch (error) {
      this.handleError(error, "generating multi-modal lesson");
      return this.getDefaultMultiModalLesson(topic, targetLanguage);
    }
  }

  // Helper methods for calculations
  private calculateAccuracy(responses: any[]): number {
    if (responses.length === 0) return 0;
    const correct = responses.filter(r => r.userAnswer.toLowerCase().trim() === r.correctAnswer.toLowerCase().trim()).length;
    return Math.round((correct / responses.length) * 100);
  }

  private calculateFluency(conversationTurns: any[]): number {
    if (conversationTurns.length === 0) return 0;
    const avgNaturalness = conversationTurns.reduce((sum, turn) => sum + (turn.naturalness || 0), 0) / conversationTurns.length;
    return Math.round(avgNaturalness * 100);
  }

  private calculateComprehension(responses: any[]): number {
    if (responses.length === 0) return 0;
    const comprehensionResponses = responses.filter(r => r.type === 'comprehension');
    if (comprehensionResponses.length === 0) return 75; // Default
    const correct = comprehensionResponses.filter(r => r.userAnswer.toLowerCase().includes(r.correctAnswer.toLowerCase())).length;
    return Math.round((correct / comprehensionResponses.length) * 100);
  }

  private calculateVocabularyScore(responses: any[]): number {
    const vocabResponses = responses.filter(r => r.type === 'vocabulary');
    if (vocabResponses.length === 0) return 70;
    const correct = vocabResponses.filter(r => r.userAnswer.toLowerCase() === r.correctAnswer.toLowerCase()).length;
    return Math.round((correct / vocabResponses.length) * 100);
  }

  private calculateGrammarScore(responses: any[]): number {
    const grammarResponses = responses.filter(r => r.type === 'grammar');
    if (grammarResponses.length === 0) return 65;
    const correct = grammarResponses.filter(r => r.userAnswer.toLowerCase() === r.correctAnswer.toLowerCase()).length;
    return Math.round((correct / grammarResponses.length) * 100);
  }

  private calculateCulturalScore(responses: any[]): number {
    const culturalResponses = responses.filter(r => r.type === 'cultural');
    if (culturalResponses.length === 0) return 80;
    const correct = culturalResponses.filter(r => r.userAnswer.toLowerCase().includes(r.correctAnswer.toLowerCase())).length;
    return Math.round((correct / culturalResponses.length) * 100);
  }

  private generateContextualFeedback(accuracy: number, fluency: number, comprehension: number, level: string): string {
    if (accuracy >= 80 && fluency >= 80) {
      return "Excellent performance! You're demonstrating strong mastery of the material.";
    } else if (accuracy >= 60 && fluency >= 60) {
      return "Good progress! Focus on areas where you hesitated to build confidence.";
    } else {
      return "Keep practicing! Consider reviewing fundamentals and practicing more slowly.";
    }
  }

  private generateRecommendations(sessionData: any, level: string): string[] {
    const recommendations = [
      "Practice vocabulary in context",
      "Focus on pronunciation clarity",
      "Review grammar fundamentals"
    ];

    if (level === 'beginner') {
      recommendations.push("Build foundation with basic phrases");
    } else if (level === 'intermediate') {
      recommendations.push("Work on conversational fluency");
    } else {
      recommendations.push("Practice advanced expressions and idioms");
    }

    return recommendations;
  }

  // Default fallback methods
  private getDefaultAnalytics(): LearningAnalytics {
    return {
      strengths: ["Vocabulary retention", "Pronunciation effort"],
      weaknesses: ["Grammar consistency", "Fluency speed"],
      recommendedFocus: ["Grammar practice", "Conversation drills"],
      progressMetrics: {
        vocabulary: 70,
        grammar: 60,
        pronunciation: 75,
        fluency: 65
      },
      nextMilestones: ["Master present tense", "Expand vocabulary to 500 words"]
    };
  }

  private getDefaultCurriculum(learnerData: any, targetLanguage: string): PersonalizedCurriculum {
    return {
      learnerProfile: {
        level: learnerData.level,
        interests: learnerData.interests,
        learningStyle: learnerData.learningStyle,
        goals: learnerData.goals
      },
      adaptedLessons: [
        {
          title: `Introduction to ${targetLanguage}`,
          difficulty: 1,
          estimatedTime: 30,
          prerequisites: [],
          outcomes: ["Basic greetings", "Numbers 1-10"],
          content: {
            vocabulary: [
              { word: "hello", context: "greeting", difficulty: 1 },
              { word: "goodbye", context: "farewell", difficulty: 1 }
            ],
            grammar: [
              { rule: "Basic sentence structure", examples: ["Hello, I am..."], exercises: ["Introduce yourself"] }
            ],
            cultural: [
              { topic: "Greetings", content: "Cultural greeting customs", discussion: ["How do people greet in your culture?"] }
            ]
          }
        }
      ],
      progressionPath: ["Basics", "Intermediate Conversation", "Advanced Communication"]
    };
  }

  private getDefaultAssessment(): RealTimeAssessment {
    return {
      accuracy: 70,
      fluency: 65,
      comprehension: 75,
      areas: {
        pronunciation: 70,
        vocabulary: 75,
        grammar: 60,
        cultural: 80
      },
      feedback: "Good effort! Continue practicing to build confidence.",
      recommendations: ["Practice pronunciation", "Review grammar basics", "Expand vocabulary"]
    };
  }

  private getDefaultAdaptiveContent(performance: RealTimeAssessment, preferences: any) {
    return {
      nextExercises: [
        {
          type: "vocabulary",
          content: "Practice common words",
          difficulty: 2,
          expectedTime: 10,
          adaptationReason: "Building vocabulary foundation"
        }
      ],
      adjustedDifficulty: preferences.difficulty,
      focusShift: "Maintain current focus"
    };
  }

  private getDefaultMultiModalLesson(topic: string, targetLanguage: string) {
    return {
      visualElements: [
        { type: "infographic", content: `${topic} vocabulary chart`, description: "Visual word associations" }
      ],
      auditoryElements: [
        { text: "Practice pronunciation", pronunciation: "/pronunciation/", audioScript: "Listen and repeat" }
      ],
      interactiveElements: [
        { activity: "Role play", instructions: "Practice conversation", expectedOutcome: "Improved fluency" }
      ],
      readingMaterials: [
        { title: `${topic} article`, content: "Reading passage", comprehensionQuestions: ["What is the main idea?"] }
      ]
    };
  }
}

export const advancedAIService = new AdvancedAIService();