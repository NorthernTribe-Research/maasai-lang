import { BaseService } from './BaseService';
import { GeminiService } from './GeminiService';
import { User, UserLanguage, Language } from '../../shared/schema';
import { storage } from '../storage';

export interface LearningProfile {
  userId: number;
  languageId: number;
  knowledgeState: KnowledgeState;
  learningStyle: LearningStyle;
  performance: PerformanceMetrics;
  preferences: LearningPreferences;
  adaptations: AdaptationHistory[];
}

export interface KnowledgeState {
  masteredConcepts: string[];
  strugglingConcepts: string[];
  recentMistakes: MistakeRecord[];
  skillLevels: { [skill: string]: number }; // 0-100
  confidenceScores: { [topic: string]: number }; // 0-100
  lastAssessment: Date;
}

export interface LearningStyle {
  visual: number; // 0-100
  auditory: number; // 0-100
  kinesthetic: number; // 0-100
  reading: number; // 0-100
  preferredPace: 'slow' | 'medium' | 'fast';
  sessionLength: number; // preferred minutes
}

export interface PerformanceMetrics {
  accuracy: number; // 0-100
  speed: number; // responses per minute
  retention: number; // 0-100
  engagement: number; // 0-100
  streak: number;
  totalSessions: number;
  averageSessionTime: number;
}

export interface LearningPreferences {
  interests: string[];
  goals: string[];
  motivations: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  difficulty: 'easy' | 'medium' | 'challenging';
  feedbackStyle: 'encouraging' | 'neutral' | 'detailed';
}

export interface MistakeRecord {
  concept: string;
  mistake: string;
  correction: string;
  timestamp: Date;
  repeated: number;
}

export interface AdaptationHistory {
  timestamp: Date;
  trigger: string;
  adaptation: string;
  effectiveness: number; // 0-100
}

export interface ContentRecommendation {
  type: 'lesson' | 'exercise' | 'review' | 'challenge';
  content: any;
  reasoning: string;
  priority: number; // 1-10
  estimatedTime: number;
  difficulty: number; // 1-5
}

/**
 * AI-powered adaptive learning service that personalizes content based on user performance
 */
export class AdaptiveLearningService extends BaseService {
  private geminiService: GeminiService;
  private learningProfiles: Map<string, LearningProfile> = new Map();

  constructor(geminiService: GeminiService) {
    super();
    this.geminiService = geminiService;
    this.log("Adaptive Learning service initialized", "info");
  }

  /**
   * Get or create learning profile for user
   */
  async getLearningProfile(userId: number, languageId: number): Promise<LearningProfile> {
    const key = `${userId}_${languageId}`;
    
    if (!this.learningProfiles.has(key)) {
      const profile = await this.createLearningProfile(userId, languageId);
      this.learningProfiles.set(key, profile);
    }
    
    return this.learningProfiles.get(key)!;
  }

  /**
   * Create initial learning profile
   */
  private async createLearningProfile(userId: number, languageId: number): Promise<LearningProfile> {
    return {
      userId,
      languageId,
      knowledgeState: {
        masteredConcepts: [],
        strugglingConcepts: [],
        recentMistakes: [],
        skillLevels: {
          vocabulary: 0,
          grammar: 0,
          listening: 0,
          speaking: 0,
          reading: 0,
          writing: 0
        },
        confidenceScores: {},
        lastAssessment: new Date()
      },
      learningStyle: {
        visual: 50,
        auditory: 50,
        kinesthetic: 25,
        reading: 50,
        preferredPace: 'medium',
        sessionLength: 30
      },
      performance: {
        accuracy: 50,
        speed: 5,
        retention: 50,
        engagement: 50,
        streak: 0,
        totalSessions: 0,
        averageSessionTime: 0
      },
      preferences: {
        interests: [],
        goals: [],
        motivations: [],
        timeOfDay: 'evening',
        difficulty: 'medium',
        feedbackStyle: 'encouraging'
      },
      adaptations: []
    };
  }

  /**
   * Update learning profile based on session data
   */
  async updateLearningProfile(
    userId: number,
    languageId: number,
    sessionData: {
      responses: Array<{
        question: string;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        responseTime: number;
        concept: string;
      }>;
      sessionDuration: number;
      engagement: number;
    }
  ): Promise<void> {
    try {
      const profile = await this.getLearningProfile(userId, languageId);
      
      // Update performance metrics
      const accuracy = sessionData.responses.reduce((acc, r) => acc + (r.isCorrect ? 1 : 0), 0) / sessionData.responses.length * 100;
      profile.performance.accuracy = (profile.performance.accuracy + accuracy) / 2;
      profile.performance.totalSessions++;
      profile.performance.averageSessionTime = (profile.performance.averageSessionTime + sessionData.sessionDuration) / 2;
      profile.performance.engagement = (profile.performance.engagement + sessionData.engagement) / 2;
      
      // Update knowledge state
      sessionData.responses.forEach(response => {
        if (response.isCorrect) {
          if (!profile.knowledgeState.masteredConcepts.includes(response.concept)) {
            profile.knowledgeState.masteredConcepts.push(response.concept);
          }
          // Remove from struggling if now mastered
          const index = profile.knowledgeState.strugglingConcepts.indexOf(response.concept);
          if (index > -1) {
            profile.knowledgeState.strugglingConcepts.splice(index, 1);
          }
        } else {
          if (!profile.knowledgeState.strugglingConcepts.includes(response.concept)) {
            profile.knowledgeState.strugglingConcepts.push(response.concept);
          }
          
          // Record mistake
          profile.knowledgeState.recentMistakes.push({
            concept: response.concept,
            mistake: response.userAnswer,
            correction: response.correctAnswer,
            timestamp: new Date(),
            repeated: profile.knowledgeState.recentMistakes.filter(m => 
              m.concept === response.concept && m.mistake === response.userAnswer
            ).length
          });
        }
      });
      
      // Keep only recent mistakes (last 50)
      profile.knowledgeState.recentMistakes = profile.knowledgeState.recentMistakes
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50);
      
      this.learningProfiles.set(`${userId}_${languageId}`, profile);
    } catch (error) {
      this.handleError(error, "AdaptiveLearningService.updateLearningProfile");
    }
  }

  /**
   * Get personalized content recommendations
   */
  async getRecommendations(
    userId: number,
    languageId: number,
    sessionType: 'lesson' | 'practice' | 'review' | 'assessment'
  ): Promise<ContentRecommendation[]> {
    try {
      const profile = await this.getLearningProfile(userId, languageId);
      const language = await storage.getLanguageByCode('en'); // This would be dynamic
      
      const prompt = `
        Generate personalized learning recommendations for a language learner.
        
        User Profile:
        - Session Type: ${sessionType}
        - Mastered Concepts: ${profile.knowledgeState.masteredConcepts.join(', ')}
        - Struggling Concepts: ${profile.knowledgeState.strugglingConcepts.join(', ')}
        - Recent Mistakes: ${profile.knowledgeState.recentMistakes.map(m => `${m.concept}: ${m.mistake} -> ${m.correction}`).join(', ')}
        - Accuracy: ${profile.performance.accuracy}%
        - Learning Style: Visual(${profile.learningStyle.visual}%), Auditory(${profile.learningStyle.auditory}%), Reading(${profile.learningStyle.reading}%)
        - Preferred Session Length: ${profile.learningStyle.sessionLength} minutes
        - Interests: ${profile.preferences.interests.join(', ')}
        
        Generate 3-5 personalized recommendations with:
        1. Focus on struggling concepts
        2. Reinforce recent mistakes
        3. Match learning style preferences
        4. Consider session length and difficulty preferences
        
        Return JSON array:
        [
          {
            "type": "lesson|exercise|review|challenge",
            "content": {
              "title": "content_title",
              "description": "what_this_covers",
              "concepts": ["concept1", "concept2"],
              "activities": ["activity_type1", "activity_type2"]
            },
            "reasoning": "why_this_is_recommended",
            "priority": 1-10,
            "estimatedTime": minutes,
            "difficulty": 1-5
          }
        ]
      `;

      const response = await this.geminiService.generateContent(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "AdaptiveLearningService.getRecommendations");
      return [];
    }
  }

  /**
   * Analyze user performance and suggest difficulty adjustments
   */
  async analyzeDifficultyAdjustment(
    userId: number,
    languageId: number,
    recentSessions: number = 5
  ): Promise<{
    currentDifficulty: number;
    suggestedDifficulty: number;
    reasoning: string;
    adjustmentType: 'increase' | 'decrease' | 'maintain';
  }> {
    try {
      const profile = await this.getLearningProfile(userId, languageId);
      
      const prompt = `
        Analyze user performance and suggest difficulty adjustment.
        
        Performance Data:
        - Current Accuracy: ${profile.performance.accuracy}%
        - Recent Mistakes: ${profile.knowledgeState.recentMistakes.length}
        - Engagement Level: ${profile.performance.engagement}%
        - Mastered Concepts: ${profile.knowledgeState.masteredConcepts.length}
        - Struggling Concepts: ${profile.knowledgeState.strugglingConcepts.length}
        
        Difficulty Guidelines:
        - If accuracy > 85% and high engagement: increase difficulty
        - If accuracy < 60% or low engagement: decrease difficulty
        - If accuracy 60-85%: maintain current difficulty
        
        Return JSON:
        {
          "currentDifficulty": 1-5,
          "suggestedDifficulty": 1-5,
          "reasoning": "explanation_for_adjustment",
          "adjustmentType": "increase|decrease|maintain"
        }
      `;

      const response = await this.openAIService.generateContent(prompt, { format: 'json' });
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "AdaptiveLearningService.analyzeDifficultyAdjustment");
      return {
        currentDifficulty: 3,
        suggestedDifficulty: 3,
        reasoning: "Unable to analyze performance data",
        adjustmentType: 'maintain'
      };
    }
  }

  /**
   * Generate spaced repetition schedule
   */
  async generateSpacedRepetition(
    userId: number,
    languageId: number
  ): Promise<Array<{
    concept: string;
    nextReview: Date;
    interval: number; // days
    repetitions: number;
    easiness: number;
  }>> {
    try {
      const profile = await this.getLearningProfile(userId, languageId);
      const now = new Date();
      
      const items = [];
      
      // Add struggling concepts for more frequent review
      profile.knowledgeState.strugglingConcepts.forEach(concept => {
        items.push({
          concept,
          nextReview: new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000)), // 1 day
          interval: 1,
          repetitions: 0,
          easiness: 1.3
        });
      });
      
      // Add mastered concepts for spaced review
      profile.knowledgeState.masteredConcepts.forEach(concept => {
        items.push({
          concept,
          nextReview: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)), // 7 days
          interval: 7,
          repetitions: 1,
          easiness: 2.5
        });
      });
      
      return items;
    } catch (error) {
      this.handleError(error, "AdaptiveLearningService.generateSpacedRepetition");
      return [];
    }
  }

  /**
   * Get learning insights for user
   */
  async getLearningInsights(userId: number, languageId: number): Promise<{
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    progress: number;
    nextMilestone: string;
  }> {
    try {
      const profile = await this.getLearningProfile(userId, languageId);
      
      const prompt = `
        Generate learning insights for a language learner.
        
        Profile Data:
        - Mastered: ${profile.knowledgeState.masteredConcepts.length} concepts
        - Struggling: ${profile.knowledgeState.strugglingConcepts.length} concepts
        - Accuracy: ${profile.performance.accuracy}%
        - Engagement: ${profile.performance.engagement}%
        - Sessions: ${profile.performance.totalSessions}
        - Streak: ${profile.performance.streak}
        
        Provide insights on:
        1. Key strengths (what they're doing well)
        2. Areas for improvement
        3. Actionable recommendations
        4. Overall progress assessment
        5. Next learning milestone
        
        Return JSON:
        {
          "strengths": ["strength1", "strength2"],
          "weaknesses": ["weakness1", "weakness2"],
          "recommendations": ["recommendation1", "recommendation2"],
          "progress": 0-100,
          "nextMilestone": "description_of_next_goal"
        }
      `;

      const response = await this.openAIService.generateContent(prompt, { format: 'json' });
      return JSON.parse(response);
    } catch (error) {
      this.handleError(error, "AdaptiveLearningService.getLearningInsights");
      return {
        strengths: ["Consistent practice"],
        weaknesses: ["Need more vocabulary work"],
        recommendations: ["Focus on daily vocabulary practice"],
        progress: 50,
        nextMilestone: "Complete beginner level"
      };
    }
  }
}